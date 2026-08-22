import { Routes } from '@angular/router';
import { unsavedChangesGuard } from './features/report-builder/report-canvas/unsaved-changes.guard';

export const routes: Routes = [
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
