import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

async function start() {
  const cordova = window['cordova'];
  if (cordova) {
    await new Promise(resolve => document.addEventListener('deviceready', resolve, false));
  }
  await platformBrowserDynamic().bootstrapModule(AppModule);
  try {
    if ((location.protocol === 'https:') && ('serviceWorker' in navigator)) {
      await navigator.serviceWorker.register('service-worker.js');
    }
  } catch (error) {}
}

start();
