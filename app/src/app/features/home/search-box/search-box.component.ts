import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { HomeStore } from '../home.store';

/** The whole-tree search field. Reads and drives the query on the store; debouncing lives there. */
@Component({
  selector: 'app-search-box',
  imports: [FormsModule, InputTextModule],
  templateUrl: './search-box.component.html',
  styleUrl: './search-box.component.scss',
})
export class SearchBoxComponent {
  private readonly store = inject(HomeStore);

  public onSearchInput(value: string): void {
    this.store.onSearchInput(value);
  }

  public clearSearch(): void {
    this.store.clearSearch();
  }

  public get searchQuery() {
    return this.store.searchQuery;
  }
}
