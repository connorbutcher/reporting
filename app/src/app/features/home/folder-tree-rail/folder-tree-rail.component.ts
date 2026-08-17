import { Component, inject } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { TreeModule } from 'primeng/tree';
import { HomeStore } from '../home.store';

/** The left rail: heading, collapse toggle, and the lazy folder tree (or its loading skeleton). */
@Component({
  selector: 'app-folder-tree-rail',
  imports: [SkeletonModule, TreeModule],
  templateUrl: './folder-tree-rail.component.html',
  styleUrl: './folder-tree-rail.component.scss',
})
export class FolderTreeRailComponent {
  protected readonly store = inject(HomeStore);
}
