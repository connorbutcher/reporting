import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DirectoryUser } from '../../../core/models/admin';
import { GroupDetailComponent } from './group-detail.component';

const person = (id: string, name: string, isGlobalAdmin = false): DirectoryUser => ({
  id,
  displayName: name,
  email: `${id}@x`,
  isGlobalAdmin,
});

const alice = person('alice', 'Alice');
const root = person('root', 'Root Admin', true);

function render(): GroupDetailComponent {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: Dialog, useValue: {} },
      { provide: NotificationService, useValue: {} },
      { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'g1' }) } } },
      {
        provide: AdminApiService,
        useValue: {
          directory: () => of([alice, root]),
          listGroups: () => of([]),
          // The group was saved with the (since-promoted) admin still recorded as a manager.
          getGroup: () =>
            of({
              id: 'g1',
              name: 'Team',
              memberCount: 2,
              members: [alice, root],
              managers: [alice, root],
            }),
        },
      },
    ],
  });
  return TestBed.createComponent(GroupDetailComponent).componentInstance;
}

describe('GroupDetailComponent global admins', () => {
  it('never offers a global admin as a member or a manager', () => {
    const component = render();

    expect(component.filteredUsers().map((u) => u.displayName)).toEqual(['Alice']);
    expect(component.managerCandidates().map((u) => u.displayName)).toEqual(['Alice']);
  });

  it('drops a global admin left over as a member or manager, so the group can still be saved', () => {
    // The group was saved before the rule, with the admin recorded as both.
    const component = render();

    expect(component.memberIds()).toEqual(['alice']);
    expect(component.managerIds()).toEqual(['alice']);
  });
});
