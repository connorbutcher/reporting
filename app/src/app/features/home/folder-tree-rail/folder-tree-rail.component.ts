import { Component, inject } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { TreeModule, TreeNodeExpandEvent, TreeNodeSelectEvent } from 'primeng/tree';
import { ReportSummary } from '../../../core/models/report';
import { HomeStore } from '../home.store';

/** The left rail: heading, collapse toggle, and the lazy folder tree (or its loading skeleton). */
@Component({
  selector: 'app-folder-tree-rail',
  imports: [SkeletonModule, TreeModule],
  templateUrl: './folder-tree-rail.component.html',
  styleUrl: './folder-tree-rail.component.scss',
})
export class FolderTreeRailComponent {
  private readonly store = inject(HomeStore);

  public toggleRail(): void {
    this.store.toggleRail();
  }

  public openReport(report: ReportSummary): void {
    this.store.openReport(report);
  }

  public toggleFavorite(report: ReportSummary): void {
    this.store.toggleFavorite(report);
  }

  public onNodeSelect(event: TreeNodeSelectEvent): void {
    this.store.onNodeSelect(event);
  }

  public onNodeExpand(event: TreeNodeExpandEvent): void {
    this.store.tree.onNodeExpand(event);
  }

  public get railCollapsed() {
    return this.store.railCollapsed;
  }

  public get favorites() {
    return this.store.favorites;
  }

  public get recent() {
    return this.store.recent;
  }

  public get treeLoading() {
    return this.store.treeLoading;
  }

  public get treeNodes() {
    return this.store.tree.nodes;
  }

  public get treeSelectionKeys() {
    return this.store.treeSelectionKeys;
  }
}
