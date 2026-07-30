import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/report-builder/report-canvas/report-canvas.component').then((m) => m.ReportCanvasComponent),
  },
];
