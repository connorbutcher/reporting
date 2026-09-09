import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CurrentUserService } from '../../core/services/current-user.service';

/**
 * The admin screen shell: a left nav card listing the sections and a right area whose router-outlet
 * shows the selected section's list or a record's detail card. Kept deliberately thin — each routed
 * view owns its own data. The Users section is full-admin-only; delegated group managers see just
 * the Groups section.
 */
@Component({
  selector: 'app-admin-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent {
  public readonly canManageUsers = inject(CurrentUserService).canManageUsers;
}
