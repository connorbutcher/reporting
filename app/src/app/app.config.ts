import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { provideEchartsCore } from 'ngx-echarts';

import { routes } from './app.routes';
import { ReportingPreset } from './theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    providePrimeNG({
      theme: {
        preset: ReportingPreset,
        options: {
          darkModeSelector: '.app-dark',
        },
      },
    }),
    // Loaded on demand rather than bundled up front, since not every report has a chart.
    provideEchartsCore({ echarts: () => import('echarts') }),
  ],
};
