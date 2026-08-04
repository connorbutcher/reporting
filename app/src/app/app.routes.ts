import { Routes } from '@angular/router';

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
  {
    path: 'datasets',
    loadComponent: () =>
      import('./features/datasets/datasets-page.component').then((m) => m.DatasetsPageComponent),
  },
  { path: '**', redirectTo: '' },
];
