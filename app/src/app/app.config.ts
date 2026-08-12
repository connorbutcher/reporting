import { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';
import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { providePrimeNG } from 'primeng/config';
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
    { provide: OVERLAY_DEFAULT_CONFIG, useValue: { usePopover: false } },
    // Loaded on demand rather than bundled up front, since not every report has a chart.
    provideEchartsCore({ echarts: () => import('echarts') }),
  ],
};
