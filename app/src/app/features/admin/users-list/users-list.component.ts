import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TableFilterEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AdminUser } from '../../../core/models/admin';

/** The Users section: a table of users; a row opens that user's detail card, and New opens a blank one. */
@Component({
  selector: 'app-users-list',
  imports: [TableModule, TagModule, ButtonModule, SkeletonModule, InputTextModule],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent {
  public readonly users = computed(() =>
    this.resource.hasValue() ? this.resource.value() : [],
  );
  public readonly loading = computed(() => this.resource.isLoading());
  public readonly failed = computed(() => this.resource.error() != null);
  /** Subtitle text — "N people", or "M of N people" once the table's own global filter (see
   * `onFilter`) has narrowed the rows shown. */
  public readonly countLabel = computed(() => {
    const total = this.users().length;
    const noun = total === 1 ? 'person' : 'people';
    const filtered = this.filteredCount();
    return filtered === null || filtered === total ? `${total} ${noun}` : `${filtered} of ${total} ${noun}`;
  });

  private readonly router = inject(Router);
  private readonly resource = httpResource<AdminUser[]>(() => '/api/admin/users', {
    defaultValue: [],
  });
  /** Set from the table's `onFilter` event — null until the search box is used. */
  private readonly filteredCount = signal<number | null>(null);

  /** PrimeNG's own table search (`p-table[globalFilterFields]` + `Table.filterGlobal`, wired from
   * the `#caption` template's search box) — see the component template. */
  public onFilter(event: TableFilterEvent): void {
    this.filteredCount.set(Array.isArray(event.filteredValue) ? event.filteredValue.length : null);
  }

  public open(user: AdminUser): void {
    this.router.navigate(['/admin/users', user.id]);
  }

  public create(): void {
    this.router.navigate(['/admin/users/new']);
  }
}
