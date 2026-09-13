import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CurrentUserService } from '../../core/services/current-user.service';

/**
 * The admin screen shell: a left nav card listing the sections and a right area whose router-outlet
 * shows the selected section's list or a record's detail card. Kept deliberately thin — each routed
 * view owns its own data. The Users section needs the manage-users permission; the Groups section
 * needs to manage at least one group — a user may have either, both, or (for a global admin) all.
 */
@Component({
  selector: 'app-admin-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent {
  public readonly canManageUsers = inject(CurrentUserService).canManageUsers;
  public readonly canManageGroups = inject(CurrentUserService).canManageGroups;
}
