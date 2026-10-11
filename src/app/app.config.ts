import {
  type ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { CanvasPhotoShrinker } from './data/canvas-photo-shrinker';
import { IndexedDbOutboxStore } from './data/indexeddb-outbox-store';
import { LocalStorageSettingsStore } from './data/local-storage-settings-store';
import { OutboxState } from './data/outbox-state';
import { requestPersistentStorage } from './data/persistent-storage';
import { WebShareSharer } from './data/web-share-sharer';
import { Outbox } from './domain/outbox';
import { FileSharer, OutboxStore, PhotoShrinker, SettingsStore } from './domain/ports';
import { routes } from './app.routes';

/** The one place where ports (domain) are connected to their adapters (data). */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash routing: GitHub Pages has no server fallback for deep links.
    provideRouter(routes, withHashLocation()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    { provide: OutboxStore, useClass: IndexedDbOutboxStore },
    { provide: PhotoShrinker, useClass: CanvasPhotoShrinker },
    { provide: FileSharer, useClass: WebShareSharer },
    { provide: SettingsStore, useClass: LocalStorageSettingsStore },
    {
      provide: Outbox,
      useFactory: () => new Outbox(inject(OutboxStore), () => crypto.randomUUID(), () => new Date()),
    },
    provideAppInitializer(() => {
      void inject(OutboxState).start();
      void requestPersistentStorage();
    }),
  ],
};
