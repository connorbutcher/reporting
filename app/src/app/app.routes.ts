import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/report-builder/report-canvas/report-canvas.component').then(
        (m) => m.ReportCanvasComponent,
      ),
  },
  {
    path: 'datasets',
    loadComponent: () =>
      import('./features/datasets/datasets-page.component').then((m) => m.DatasetsPageComponent),
  },
  { path: '**', redirectTo: '' },
];
