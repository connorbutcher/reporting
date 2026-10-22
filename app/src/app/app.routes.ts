import { Routes } from '@angular/router';
import { AdminGuards } from './features/admin/admin-guards';
import { UnsavedChangesGuard } from './features/report-builder/report-canvas/unsaved-changes.guard';

export class AppRoutes {
  public static readonly ROUTES: Routes = [
    {
      path: 'admin',
      canMatch: [AdminGuards.adminArea],
      loadComponent: () =>
        import('./features/admin/admin-page.component').then((m) => m.AdminPageComponent),
      children: [
        { path: '', pathMatch: 'full', redirectTo: 'users' },
        {
          path: 'users',
          canMatch: [AdminGuards.fullAdmin],
          loadComponent: () =>
            import('./features/admin/users-list/users-list.component').then(
              (m) => m.UsersListComponent,
            ),
        },
        {
          path: 'users/new',
          canMatch: [AdminGuards.fullAdmin],
          loadComponent: () =>
            import('./features/admin/user-detail/user-detail.component').then(
              (m) => m.UserDetailComponent,
            ),
        },
        {
          path: 'users/:id',
          canMatch: [AdminGuards.fullAdmin],
          loadComponent: () =>
            import('./features/admin/user-detail/user-detail.component').then(
              (m) => m.UserDetailComponent,
            ),
        },
        {
          path: 'groups',
          canMatch: [AdminGuards.groupManager],
          loadComponent: () =>
            import('./features/admin/groups-list/groups-list.component').then(
              (m) => m.GroupsListComponent,
            ),
        },
        {
          path: 'groups/new',
          canMatch: [AdminGuards.groupManager],
          loadComponent: () =>
            import('./features/admin/group-detail/group-detail.component').then(
              (m) => m.GroupDetailComponent,
            ),
        },
        {
          path: 'groups/:id',
          canMatch: [AdminGuards.groupManager],
          loadComponent: () =>
            import('./features/admin/group-detail/group-detail.component').then(
              (m) => m.GroupDetailComponent,
            ),
        },
      ],
    },
    {
      path: '',
      pathMatch: 'full',
      loadComponent: () =>
        import('./features/home/home-page.component').then((m) => m.HomePageComponent),
    },
    {
      path: 'reports/:reportId/edit',
      loadComponent: () =>
        import('./features/report-builder/report-canvas/report-canvas.component').then(
          (m) => m.ReportCanvasComponent,
        ),
      canDeactivate: [UnsavedChangesGuard.canDeactivate],
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
        import('./features/report-viewer/report-viewer.component').then(
          (m) => m.ReportViewerComponent,
        ),
    },
    {
      path: 'reports/:reportId',
      loadComponent: () =>
        import('./features/report-viewer/report-viewer.component').then(
          (m) => m.ReportViewerComponent,
        ),
    },
    { path: '**', redirectTo: '' },
  ];
}
