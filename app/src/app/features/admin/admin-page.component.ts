import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CurrentUserService } from '../../core/services/current-user.service';

/** Admin shell: section nav and a router outlet. Each routed view owns its own data. */
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
