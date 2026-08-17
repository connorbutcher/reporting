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
  protected readonly store = inject(HomeStore);
}
