import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { HomeStore } from '../home.store';

/** Whole-tree search results: a loading skeleton, an empty message, or a sortable table of matches. */
@Component({
  selector: 'app-search-results',
  imports: [DatePipe, TableModule, SkeletonModule],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss',
})
export class SearchResultsComponent {
  protected readonly store = inject(HomeStore);

  /** Only rendered while a search is active, but the store's signal is nullable — treat null as empty. */
  protected readonly results = computed(() => this.store.searchResults() ?? []);
}
