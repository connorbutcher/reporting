import { Routes } from '@angular/router';
import { canManageUsersGuard } from './features/admin/admin.guard';
import { unsavedChangesGuard } from './features/report-builder/report-canvas/unsaved-changes.guard';

export const routes: Routes = [
  {
    path: 'admin',
    canMatch: [canManageUsersGuard],
    loadComponent: () =>
      import('./features/admin/admin-page.component').then((m) => m.AdminPageComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'users' },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/users-list/users-list.component').then((m) => m.UsersListComponent),
      },
      {
        path: 'users/new',
        loadComponent: () =>
          import('./features/admin/user-detail/user-detail.component').then((m) => m.UserDetailComponent),
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./features/admin/user-detail/user-detail.component').then((m) => m.UserDetailComponent),
      },
      {
        path: 'groups',
        loadComponent: () =>
          import('./features/admin/groups-list/groups-list.component').then((m) => m.GroupsListComponent),
      },
      {
        path: 'groups/new',
        loadComponent: () =>
          import('./features/admin/group-detail/group-detail.component').then((m) => m.GroupDetailComponent),
      },
      {
        path: 'groups/:id',
        loadComponent: () =>
          import('./features/admin/group-detail/group-detail.component').then((m) => m.GroupDetailComponent),
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home-page.component').then((m) => m.HomePageComponent),
  },
  {
    path: 'reports/:reportId/edit',
    loadComponent: () =>
      import('./features/report-builder/report-canvas/report-canvas.component').then(
        (m) => m.ReportCanvasComponent,
      ),
    canDeactivate: [unsavedChangesGuard],
  },
  {
    // The datasets of a report's checked-out draft are managed here, reached from the builder.
    path: 'reports/:reportId/edit/datasets',
    loadComponent: () =>
      import('./features/datasets/datasets-page/datasets-page.component').then(
        (m) => m.DatasetsPageComponent,
      ),
  },
  {
    path: 'reports/:reportId/versions/:versionNumber',
    loadComponent: () =>
      import('./features/report-viewer/report-viewer.component').then((m) => m.ReportViewerComponent),
  },
  {
    path: 'reports/:reportId',
    loadComponent: () =>
      import('./features/report-viewer/report-viewer.component').then((m) => m.ReportViewerComponent),
  },
  { path: '**', redirectTo: '' },
];
