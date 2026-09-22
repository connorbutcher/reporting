import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TableFilterEvent, TableModule } from 'primeng/table';
import { AdminGroup } from '../../../core/models/admin';
import { CurrentUserService } from '../../../core/services/current-user.service';

/** The Groups section: a table of groups; a row opens that group's detail card, and New opens a blank one. */
@Component({
  selector: 'app-groups-list',
  imports: [TableModule, ButtonModule, SkeletonModule, InputTextModule],
  templateUrl: './groups-list.component.html',
  styleUrl: './groups-list.component.scss',
})
export class GroupsListComponent {
  public readonly groups = computed(() =>
    this.resource.hasValue() ? this.resource.value() : [],
  );
  public readonly loading = computed(() => this.resource.isLoading());
  public readonly failed = computed(() => this.resource.error() != null);
  /** A global admin or a create-groups permission holder can create groups; a plain delegated
   * manager only edits the ones they already manage. */
  public readonly canCreate = inject(CurrentUserService).canCreateGroups;
  /** Subtitle text — "N groups", or "M of N groups" once the table's own global filter (see
   * `onFilter`) has narrowed the rows shown. */
  public readonly countLabel = computed(() => {
    const total = this.groups().length;
    const noun = total === 1 ? 'group' : 'groups';
    const filtered = this.filteredCount();
    return filtered === null || filtered === total ? `${total} ${noun}` : `${filtered} of ${total} ${noun}`;
  });

  private readonly router = inject(Router);
  private readonly resource = httpResource<AdminGroup[]>(() => '/api/admin/user-groups', {
    defaultValue: [],
  });
  /** Set from the table's `onFilter` event — null until the search box is used. */
  private readonly filteredCount = signal<number | null>(null);

  /** PrimeNG's own table search (`p-table[globalFilterFields]` + `Table.filterGlobal`, wired from
   * the `#caption` template's search box) — see the component template. */
  public onFilter(event: TableFilterEvent): void {
    this.filteredCount.set(Array.isArray(event.filteredValue) ? event.filteredValue.length : null);
  }

  public open(group: AdminGroup): void {
    this.router.navigate(['/admin/groups', group.id]);
  }

  public create(): void {
    this.router.navigate(['/admin/groups/new']);
  }
}
