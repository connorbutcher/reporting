import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { email as emailRule, form, required, validate } from '@angular/forms/signals';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { AdminGroup, SaveUser } from '../../../core/models/admin';
import { CurrentUserService } from '../../../core/services/current-user.service';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * The detail card for one user, reached from the users list — create when the route id is "new",
 * otherwise edit. Shown in place of the list (no dialog) so there's room for the full record:
 * name, email (fixed after creation), the manage-users permission, and group memberships. Saving
 * returns to the list.
 */
@Component({
  selector: 'app-user-detail',
  imports: [FormsModule, DatePipe, InputTextModule, CheckboxModule, ButtonModule, TagModule],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
})
export class UserDetailComponent {
  public readonly loading = signal(true);
  public readonly saving = signal(false);
  public readonly loadError = signal<string | null>(null);
  public readonly saveError = signal<string | null>(null);

  public readonly isNew = signal(true);
  public readonly isGlobalAdmin = signal(false);
  /** The user manages users directly and is editing themselves, so the toggle is locked on. */
  public readonly lockManageUsers = signal(false);
  public readonly createdAt = signal<string | null>(null);

  public readonly canManageUsers = signal(false);
  public readonly groupIds = signal<string[]>([]);
  public readonly groupFilter = signal('');
  public readonly groupOptions = signal<AdminGroup[]>([]);

  public readonly filteredGroups = computed(() => {
    const query = this.groupFilter().trim().toLowerCase();
    const options = [...this.groupOptions()].sort((a, b) => a.name.localeCompare(b.name));
    return query ? options.filter((g) => g.name.toLowerCase().includes(query)) : options;
  });

  public readonly title = computed(() => (this.isNew() ? 'New user' : 'Edit user'));

  public readonly form = form(signal({ displayName: '', email: '' }), (path) => {
    required(path.displayName, { message: 'A display name is required.' });
    required(path.email, { message: 'An email is required.' });
    emailRule(path.email, { message: 'Enter a valid email address.' });
    validate(path.email, ({ value }) => {
      if (!this.isNew()) return null;
      const taken = this.existingEmails().includes(value().trim().toLowerCase());
      return taken ? { kind: 'duplicate', message: 'A user with that email already exists.' } : null;
    });
  });

  public readonly emailError = computed(
    () =>
      this.form.email().errors().find((e) => e.kind === 'duplicate')?.message ??
      (this.form.email().dirty() && this.form.email().invalid()
        ? (this.form.email().errors()[0]?.message ?? null)
        : null),
  );

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(AdminApiService);
  private readonly notify = inject(NotificationService);
  private readonly currentUser = inject(CurrentUserService);
  private readonly existingEmails = signal<string[]>([]);
  private refId: string | null = null;

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const creating = !idParam || idParam === 'new';
    this.isNew.set(creating);
    this.refId = creating ? null : idParam;
    creating ? this.loadForCreate() : this.loadForEdit(idParam!);
  }

  public toggleGroup(id: string, checked: boolean): void {
    this.groupIds.update((ids) =>
      checked ? [...new Set([...ids, id])] : ids.filter((existing) => existing !== id),
    );
  }

  public save(): void {
    if (!this.form().valid() || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);

    const dto: SaveUser = {
      displayName: this.form.displayName().value().trim(),
      email: this.form.email().value().trim(),
      canManageUsers: this.isGlobalAdmin() || this.lockManageUsers() ? true : this.canManageUsers(),
      groupIds: this.groupIds(),
    };
    const request = this.isNew()
      ? this.api.createUser(dto)
      : this.api.updateUser(this.refId!, dto);

    request.subscribe({
      next: () => {
        this.notify.success(this.isNew() ? 'User created.' : 'User updated.');
        this.router.navigate(['/admin/users']);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.saveError.set(this.messageFor(err, 'Could not save the user.'));
      },
    });
  }

  public cancel(): void {
    this.router.navigate(['/admin/users']);
  }

  private loadForCreate(): void {
    forkJoin({ groups: this.api.listGroups(), users: this.api.listUsers() }).subscribe({
      next: ({ groups, users }) => {
        this.groupOptions.set(groups);
        this.existingEmails.set(users.map((u) => u.email.trim().toLowerCase()));
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
      detail: this.api.getUser(id),
      groups: this.api.listGroups(),
      users: this.api.listUsers(),
    }).subscribe({
      next: ({ detail, groups, users }) => {
        this.groupOptions.set(groups);
        this.existingEmails.set(
          users.filter((u) => u.id !== detail.id).map((u) => u.email.trim().toLowerCase()),
        );
        this.isGlobalAdmin.set(detail.isGlobalAdmin);
        const self = this.currentUser.user()?.id === detail.id;
        this.lockManageUsers.set(self && !detail.isGlobalAdmin && detail.canManageUsersDirect);
        this.canManageUsers.set(detail.canManageUsersDirect);
        this.groupIds.set(detail.groups.map((g) => g.id));
        this.createdAt.set(detail.createdAt);
        this.form.displayName().value.set(detail.displayName);
        this.form.email().value.set(detail.email);
        this.loading.set(false);
      },
      error: (err: { status?: number }) => {
        this.loadError.set(err?.status === 404 ? 'That user no longer exists.' : 'Could not load the user.');
        this.loading.set(false);
      },
    });
  }

  private messageFor(err: unknown, fallback: string): string {
    const e = err as { status?: number; error?: unknown };
    if (e?.status === 403) return 'You no longer have permission to do that.';
    if (e?.status === 400 && typeof e.error === 'string') return e.error;
    return fallback;
  }
}
