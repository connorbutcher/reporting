import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AdminUser } from '../../../core/models/admin';

/** The Users section: a table of users; a row opens that user's detail card, and New opens a blank one. */
@Component({
  selector: 'app-users-list',
  imports: [TableModule, TagModule, ButtonModule, SkeletonModule],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent {
  public readonly users = computed(() =>
    this.resource.hasValue() ? this.resource.value() : [],
  );
  public readonly loading = computed(() => this.resource.isLoading());
  public readonly failed = computed(() => this.resource.error() != null);

  private readonly router = inject(Router);
  private readonly resource = httpResource<AdminUser[]>(() => '/api/admin/users', {
    defaultValue: [],
  });

  public open(user: AdminUser): void {
    this.router.navigate(['/admin/users', user.id]);
  }

  public create(): void {
    this.router.navigate(['/admin/users/new']);
  }
}
