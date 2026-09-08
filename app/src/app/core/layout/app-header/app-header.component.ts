import { Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CurrentUserService } from '../../services/current-user.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent {
  public readonly title = input('Reporting');

  private readonly currentUser = inject(CurrentUserService);

  /** The admin area is only offered to users who can manage the directory. */
  public get canManageUsers() {
    return this.currentUser.canManageUsers;
  }
}
