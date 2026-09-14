import { Component, OnInit, inject, viewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { ContextMenu, ContextMenuModule } from 'primeng/contextmenu';
import { SkeletonModule } from 'primeng/skeleton';
import { RowAction } from './content-row';
import { ContentsListComponent } from './contents-list/contents-list.component';
import { FolderTreeRailComponent } from './folder-tree-rail/folder-tree-rail.component';
import { FolderTreeStore } from './folder-tree.store';
import { HomeContentsStore } from './home-contents.store';
import { HomeItemActionsService } from './home-item-actions.service';
import { HomeSearchStore } from './home-search.store';
import { HomeStore } from './home.store';
import { SearchBoxComponent } from './search-box/search-box.component';
import { SearchResultsComponent } from './search-results/search-results.component';

/**
 * The home screen shell: lays out the tree rail, toolbar, and contents sections, and owns the
 * one shared context-menu overlay. All state and behaviour live in {@link HomeStore}, which the
 * shell provides and holds privately — the template binds only to this component's own
 * pass-throughs, never to the store directly.
 */
@Component({
  selector: 'app-home-page',
  imports: [
    ButtonModule,
    BreadcrumbModule,
    ContextMenuModule,
    SkeletonModule,
    FolderTreeRailComponent,
    SearchBoxComponent,
    SearchResultsComponent,
    ContentsListComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  providers: [
    HomeStore,
    HomeContentsStore,
    HomeSearchStore,
    FolderTreeStore,
    HomeItemActionsService,
  ],
})
export class HomePageComponent implements OnInit {
  private readonly store = inject(HomeStore);
  private readonly contextMenu = viewChild.required<ContextMenu>('cm');

  public ngOnInit(): void {
    this.store.init();
  }

  public clearSearch(): void {
    this.store.clearSearch();
  }

  public openCreateDialog(): void {
    this.store.openCreateDialog();
  }

  /**
   * The shared context-menu overlay lives here in the shell — it needs a view ref to open — so the
   * row sections bubble their right-click up to it. Everything else they drive on the store directly.
   */
  public onRowAction({ event, row }: RowAction): void {
    this.store.prepareContextMenu(row);
    this.contextMenu().show(event);
  }

  public get searchResults() {
    return this.store.searchResults;
  }

  public get breadcrumbItems() {
    return this.store.breadcrumbItems;
  }

  public get homeItem(): MenuItem {
    return this.store.homeItem;
  }

  public get actionsBusy() {
    return this.store.actionsBusy;
  }

  public get contentsLoading() {
    return this.store.contentsLoading;
  }

  public get contentsError() {
    return this.store.contentsError;
  }

  public get hasContent() {
    return this.store.hasContent;
  }

  public get contextMenuItems() {
    return this.store.contextMenuItems;
  }
}
