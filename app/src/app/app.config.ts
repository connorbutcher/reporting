import { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { ReportingPreset } from './theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    providePrimeNG({
      theme: {
        preset: ReportingPreset,
        options: {
          darkModeSelector: '.app-dark',
        },
      },
    }),
    { provide: OVERLAY_DEFAULT_CONFIG, useValue: { usePopover: false } },
    // Single app-wide toast host: the root <p-toast> and NotificationService share this instance.
    MessageService,
    // Loaded on demand rather than bundled up front, since not every report has a
    // chart — and tree-shaken to just the modules the widget renders (see echarts.ts).
    provideEchartsCore({
      echarts: () =>
        import('./features/report-builder/widgets/chart-widget/echarts').then((m) => m.default),
    }),
  ],
};
