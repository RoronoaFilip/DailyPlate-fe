import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'photo' },
  {
    path: 'photo',
    title: 'Barcode photo · Daily Plate',
    loadComponent: () => import('./features/photo/photo-page').then((m) => m.PhotoPage),
  },
  {
    path: 'meal',
    title: 'Log a meal · Daily Plate',
    loadComponent: () => import('./features/meal/meal-page').then((m) => m.MealPage),
  },
  {
    path: 'food',
    title: 'New food · Daily Plate',
    loadComponent: () => import('./features/food/food-page').then((m) => m.FoodPage),
  },
  {
    path: 'outbox',
    title: 'Outbox · Daily Plate',
    loadComponent: () => import('./features/outbox/outbox-page').then((m) => m.OutboxPage),
  },
  {
    path: 'sent',
    title: 'Sent · Daily Plate',
    loadComponent: () => import('./features/sent/sent-page').then((m) => m.SentPage),
  },
  { path: '**', redirectTo: 'photo' },
];
