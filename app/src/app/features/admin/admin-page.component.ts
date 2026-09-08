import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * The admin screen shell: a left nav card listing the sections (Users, Groups) and a right
 * area whose router-outlet shows the selected section's list or a record's detail card. Kept
 * deliberately thin — each routed view owns its own data and behaviour.
 */
@Component({
  selector: 'app-admin-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent {}
