import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { form, required, validate, validateHttp } from '@angular/forms/signals';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { DirectoryUser, GroupNameAvailable, SaveGroup } from '../../../core/models/admin';
import { HttpErrorNotification } from '../../../core/http/http-error-notification.interceptor';
import { CurrentUserService } from '../../../core/services/current-user.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../home/confirm-dialog/confirm-dialog.component';
import { ConfirmDialogData } from '../../home/confirm-dialog/confirm-dialog-data';

/** Creates a group when the route id is "new", otherwise edits it. */
@Component({
  selector: 'app-group-detail',
  imports: [FormsModule, InputTextModule, CheckboxModule, ButtonModule],
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.scss',
})
export class GroupDetailComponent {
  public readonly loading = signal(true);
  public readonly saving = signal(false);
  public readonly loadError = signal<string | null>(null);
  public readonly saveError = signal<string | null>(null);

  public readonly isNew = signal(true);
  public readonly memberIds = signal<string[]>([]);
  public readonly managerIds = signal<string[]>([]);
  public readonly memberFilter = signal('');
  public readonly userOptions = signal<DirectoryUser[]>([]);

  /** Global admins are left out: their access is implied. */
  public readonly assignableUsers = computed(() =>
    this.userOptions().filter((u) => !u.isGlobalAdmin),
  );

  public readonly filteredUsers = computed(() => {
    const query = this.memberFilter().trim().toLowerCase();
    const options = [...this.assignableUsers()].sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    );
    return query
      ? options.filter(
          (u) =>
            u.displayName.toLowerCase().includes(query) || u.email.toLowerCase().includes(query),
        )
      : options;
  });

  public readonly managerCandidates = computed(() => {
    const members = new Set(this.memberIds());
    return [...this.assignableUsers()]
      .filter((u) => members.has(u.id))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  });

  public readonly title = computed(() => (this.isNew() ? 'New group' : 'Edit group'));

  /** A non-admin creator becomes the new group's manager, matching the server. */
  public readonly willAutoManage = computed(
    () => this.isNew() && !this.currentUser.isGlobalAdmin(),
  );

  public readonly form = form(signal({ name: '' }), (path) => {
    required(path.name, { message: 'A group name is required.' });
    // Quick check against visible groups; delegated managers can't see them all.
    validate(path.name, ({ value }) => {
      const name = value().trim().toLowerCase();
      if (!name) {
        return null;
      }
      return this.existingNames().includes(name)
        ? { kind: 'duplicate', message: `A group called "${value().trim()}" already exists.` }
        : null;
    });
    // Server check against every group, once the local checks pass.
    validateHttp<string, GroupNameAvailable>(path.name, {
      when: ({ value }) => value().trim().length > 0,
      request: ({ value }) => ({
        url: '/api/admin/user-groups/name-available',
        params: {
          name: value().trim(),
          ...(this.refId ? { excludeId: this.refId } : {}),
        } as Record<string, string>,
        context: HttpErrorNotification.skip(),
      }),
      debounce: 400,
      onSuccess: (result, { value }) =>
        result.available
          ? []
          : [{ kind: 'duplicate', message: `A group called "${value().trim()}" already exists.` }],
      onError: () => [],
    });
  });

  public readonly nameError = computed(
    () =>
      this.form
        .name()
        .errors()
        .find((e) => e.kind === 'duplicate')?.message ?? null,
  );

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminApiService);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(Dialog);
  private readonly currentUser = inject(CurrentUserService);
  private readonly existingNames = signal<string[]>([]);
  private refId: string | null = null;

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const creating = !idParam || idParam === 'new';
    this.isNew.set(creating);
    this.refId = creating ? null : idParam;
    creating ? this.loadForCreate() : this.loadForEdit(idParam!);
  }

  public toggleMember(id: string, checked: boolean): void {
    this.memberIds.update((ids) =>
      checked ? [...new Set([...ids, id])] : ids.filter((existing) => existing !== id),
    );
    if (!checked) {
      this.managerIds.update((ids) => ids.filter((existing) => existing !== id));
    }
  }

  public toggleManager(id: string, checked: boolean): void {
    this.managerIds.update((ids) =>
      checked ? [...new Set([...ids, id])] : ids.filter((existing) => existing !== id),
    );
  }

  public save(): void {
    if (!this.form().valid() || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);

    const dto: SaveGroup = {
      name: this.form.name().value().trim(),
      memberIds: this.memberIds(),
      managerIds: this.managerIds(),
    };
    const request = this.isNew()
      ? this.api.createGroup(dto)
      : this.api.updateGroup(this.refId!, dto);

    request.subscribe({
      next: () => {
        this.notify.success(this.isNew() ? 'Group created.' : 'Group updated.');
        this.router.navigate(['/admin/groups']);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.saveError.set(this.messageFor(err, 'Could not save the group.'));
      },
    });
  }

  public remove(): void {
    if (this.isNew() || !this.refId) {
      return;
    }
    const name = this.form.name().value().trim();
    this.dialog
      .open<boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Delete group',
          message: `Delete "${name}"? Members keep their accounts, but the group and any access it grants are removed. This can't be undone.`,
          confirmLabel: 'Delete',
          danger: true,
        } satisfies ConfirmDialogData,
      })
      .closed.subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.saving.set(true);
        this.api.deleteGroup(this.refId!).subscribe({
          next: () => {
            this.notify.success('Group deleted.');
            this.router.navigate(['/admin/groups']);
          },
          error: (err: unknown) => {
            this.saving.set(false);
            this.saveError.set(this.messageFor(err, 'Could not delete the group.'));
          },
        });
      });
  }

  public cancel(): void {
    this.router.navigate(['/admin/groups']);
  }

  private loadForCreate(): void {
    forkJoin({ users: this.api.directory(), groups: this.api.listGroups() }).subscribe({
      next: ({ users, groups }) => {
        this.userOptions.set(users);
        this.existingNames.set(groups.map((g) => g.name.trim().toLowerCase()));
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load the form.');
        this.loading.set(false);
      },
    });
  }

  private loadForEdit(id: string): void {
    forkJoin({
      detail: this.api.getGroup(id),
      users: this.api.directory(),
      groups: this.api.listGroups(),
    }).subscribe({
      next: ({ detail, users, groups }) => {
        this.userOptions.set(users);
        this.existingNames.set(
          groups.filter((g) => g.id !== detail.id).map((g) => g.name.trim().toLowerCase()),
        );
        // The server refuses rows for global admins, so drop them.
        const admins = new Set(users.filter((u) => u.isGlobalAdmin).map((u) => u.id));
        this.memberIds.set(detail.members.map((m) => m.id).filter((id) => !admins.has(id)));
        this.managerIds.set(detail.managers.map((m) => m.id).filter((id) => !admins.has(id)));
        this.form.name().value.set(detail.name);
        this.loading.set(false);
      },
      error: (err: { status?: number }) => {
        this.loadError.set(
          err?.status === 404 ? 'That group no longer exists.' : 'Could not load the group.',
        );
        this.loading.set(false);
      },
    });
  }

  private messageFor(err: unknown, fallback: string): string {
    const e = err as { status?: number; error?: unknown };
    if (e?.status === 403) {
      return 'You no longer have permission to do that.';
    }
    if (e?.status === 400 && typeof e.error === 'string') {
      return e.error;
    }
    return fallback;
  }
}
