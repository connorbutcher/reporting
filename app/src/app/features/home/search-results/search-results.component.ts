import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { ReportSearchResult } from '../../../core/models/report';
import { HomeStore } from '../home.store';

/** Whole-tree search results: a loading skeleton, an empty message, or a sortable table of matches. */
@Component({
  selector: 'app-search-results',
  imports: [DatePipe, TableModule, SkeletonModule],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss',
})
export class SearchResultsComponent {
  /** Only rendered while a search is active, but the store's signal is nullable — treat null as empty. */
  public readonly results = computed(() => this.store.searchResults() ?? []);

  private readonly store = inject(HomeStore);

  public openSearchResult(result: ReportSearchResult): void {
    this.store.openSearchResult(result);
  }

  public get searching() {
    return this.store.searching;
  }

  public get searchQuery() {
    return this.store.searchQuery;
  }
}
