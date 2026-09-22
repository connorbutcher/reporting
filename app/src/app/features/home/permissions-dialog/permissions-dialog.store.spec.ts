import { DIALOG_DATA } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { UserSummary } from '../../../core/models/permission';
import { PermissionsDialogStore } from './permissions-dialog.store';

const user = (id: string, name: string, isGlobalAdmin = false): UserSummary => ({
  id,
  displayName: name,
  email: `${id}@x`,
  isGlobalAdmin,
});

@Component({ template: '', providers: [PermissionsDialogStore] })
class HostComponent {
  public readonly store = inject(PermissionsDialogStore);
}

async function storeWith(users: UserSummary[]): Promise<PermissionsDialogStore> {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: DIALOG_DATA, useValue: { kind: 'report', id: 1 } },
    ],
  });
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  const http = TestBed.inject(HttpTestingController);

  const answer = (url: string): unknown => {
    if (url.endsWith('/api/reports/1/permissions')) return { inheritsPermissions: true, explicit: [], effective: [] };
    if (url.endsWith('/api/users')) return users;
    if (url.endsWith('/api/user-groups')) return [{ id: 'g1', name: 'QA', memberCount: 2 }];
    return null;
  };

  // The three resources fire their GETs from an effect, so flush in a few rounds until all have answered.
  for (let round = 0; round < 5; round++) {
    TestBed.tick();
    await Promise.resolve();
    for (const req of http.match(() => true)) {
      req.flush(answer(req.request.url) as object | null);
    }
  }

  return fixture.componentInstance.store;
}

describe('PermissionsDialogStore subject options', () => {
  it('offers ordinary people, groups and Everyone — but never a global admin', async () => {
    const store = await storeWith([user('u1', 'Alice'), user('u2', 'Root', true), user('u3', 'Bob')]);

    expect(store.subjectOptions().map((o) => o.label)).toEqual(['Everyone', 'Alice', 'Bob', 'QA (group)']);
  });
});
