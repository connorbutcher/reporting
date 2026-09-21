import { DIALOG_DATA } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { PermissionsApiService } from '../../../core/api/permissions-api.service';
import { UserSummary } from '../../../core/models/permission';
import { PermissionsDialogStore } from './permissions-dialog.store';

const user = (id: string, name: string, isGlobalAdmin = false): UserSummary => ({
  id,
  displayName: name,
  email: `${id}@x`,
  isGlobalAdmin,
});

function storeWith(users: UserSummary[]): PermissionsDialogStore {
  TestBed.configureTestingModule({
    providers: [
      PermissionsDialogStore,
      { provide: DIALOG_DATA, useValue: { kind: 'report', id: 1 } },
      {
        provide: PermissionsApiService,
        useValue: {
          get: () => of({ inheritsPermissions: true, explicit: [], effective: [] }),
          users: () => of(users),
          groups: () => of([{ id: 'g1', name: 'QA', memberCount: 2 }]),
        },
      },
    ],
  });
  return TestBed.inject(PermissionsDialogStore);
}

describe('PermissionsDialogStore subject options', () => {
  it('offers ordinary people, groups and Everyone — but never a global admin', () => {
    const store = storeWith([user('u1', 'Alice'), user('u2', 'Root', true), user('u3', 'Bob')]);

    expect(store.subjectOptions().map((o) => o.label)).toEqual(['Everyone', 'Alice', 'Bob', 'QA (group)']);
  });
});
