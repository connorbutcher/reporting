import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AdminGroup } from '../../../core/models/admin';

/** The Groups section: a table of groups; a row opens that group's detail card, and New opens a blank one. */
@Component({
  selector: 'app-groups-list',
  imports: [TableModule, TagModule, ButtonModule, SkeletonModule],
  templateUrl: './groups-list.component.html',
  styleUrl: './groups-list.component.scss',
})
export class GroupsListComponent {
  public readonly groups = computed(() =>
    this.resource.hasValue() ? this.resource.value() : [],
  );
  public readonly loading = computed(() => this.resource.isLoading());
  public readonly failed = computed(() => this.resource.error() != null);

  private readonly router = inject(Router);
  private readonly resource = httpResource<AdminGroup[]>(() => '/api/admin/user-groups', {
    defaultValue: [],
  });

  public open(group: AdminGroup): void {
    this.router.navigate(['/admin/groups', group.id]);
  }

  public create(): void {
    this.router.navigate(['/admin/groups/new']);
  }
}
