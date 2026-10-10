import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OutboxState } from './data/outbox-state';
import { TabBar } from './ui/tab-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TabBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page"><router-outlet /></main>
    <app-tab-bar [outboxCount]="state.pendingCount()" />
  `,
})
export class App {
  protected readonly state = inject(OutboxState);
}
