import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { AppHeaderComponent } from './core/layout/app-header/app-header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppHeaderComponent, Toast],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
}
