import { Component, OnInit, inject, viewChild } from '@angular/core';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { ContextMenu, ContextMenuModule } from 'primeng/contextmenu';
import { SkeletonModule } from 'primeng/skeleton';
import { RowAction } from './content-row';
import { FolderChipsComponent } from './folder-chips/folder-chips.component';
import { FolderTreeRailComponent } from './folder-tree-rail/folder-tree-rail.component';
import { HomeItemActionsService } from './home-item-actions.service';
import { HomeStore } from './home.store';
import { ReportsTableComponent } from './reports-table/reports-table.component';
import { SearchBoxComponent } from './search-box/search-box.component';
import { SearchResultsComponent } from './search-results/search-results.component';

/**
 * The home screen shell: lays out the tree rail, toolbar, and contents sections, and owns the
 * one shared context-menu overlay. All state and behaviour live in {@link HomeStore}, which the
 * shell provides and every section component injects — so this component is deliberately thin.
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
    FolderChipsComponent,
    ReportsTableComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  providers: [HomeStore, HomeItemActionsService],
})
export class HomePageComponent implements OnInit {
  protected readonly store = inject(HomeStore);
  private readonly contextMenu = viewChild.required<ContextMenu>('cm');

  ngOnInit(): void {
    this.store.init();
  }

  /**
   * The shared context-menu overlay lives here in the shell — it needs a view ref to open — so the
   * row sections bubble their right-click up to it. Everything else they drive on the store directly.
   */
  protected onRowAction({ event, row }: RowAction): void {
    this.store.prepareContextMenu(row);
    this.contextMenu().show(event);
  }
}
