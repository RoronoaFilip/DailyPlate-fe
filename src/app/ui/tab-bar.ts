import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface Tab {
  path: string;
  label: string;
  icon: string;
}

/** The bottom navigation, in the same dark navy as the desktop app's side rail. */
@Component({
  selector: 'app-tab-bar',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="tab-bar" aria-label="Main">
      @for (tab of tabs; track tab.path) {
        <a class="tab" [routerLink]="tab.path" routerLinkActive="tab-active" ariaCurrentWhenActive="page">
          <span class="tab-icon" aria-hidden="true">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
          @if (tab.path === 'outbox' && outboxCount() > 0) {
            <span class="badge" [attr.aria-label]="outboxCount() + ' waiting to send'">{{ outboxCount() }}</span>
          }
        </a>
      }
    </nav>
  `,
})
export class TabBar {
  readonly outboxCount = input(0);
  protected readonly tabs: readonly Tab[] = [
    { path: 'photo', label: 'Photo', icon: '▣' },
    { path: 'meal', label: 'Meal', icon: '◔' },
    { path: 'food', label: 'Food', icon: '+' },
    { path: 'outbox', label: 'Outbox', icon: '↗' },
  ];
}
