import { bootstrapApplication } from '@angular/platform-browser';
import { AppConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, AppConfig.CONFIG).catch((err) => console.error(err));
