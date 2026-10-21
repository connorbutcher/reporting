import { Component, input } from '@angular/core';
import { ChartSkeletonShape } from './chart-skeleton-shape';

/** A pulsing outline of the chart's shape on first load, so the widget keeps its size. */
@Component({
  selector: 'app-chart-skeleton',
  template: `
    <div class="frame" aria-hidden="true">
      @if (shape() === 'bars') {
        <div class="bars">
          @for (height of barHeights; track $index) {
            <span class="bar" [style.height.%]="height"></span>
          }
        </div>
      } @else {
        <svg class="trend" viewBox="0 0 100 40" preserveAspectRatio="none">
          <polyline points="0,32 14,26 28,29 42,17 56,21 70,9 84,14 100,4" />
        </svg>
      }
    </div>
    <span class="label">Loading chart…</span>
  `,
  styleUrl: './chart-skeleton.component.scss',
  host: {
    role: 'status',
    'aria-busy': 'true',
  },
})
export class ChartSkeletonComponent {
  public readonly shape = input<ChartSkeletonShape>('bars');

  public readonly barHeights = [46, 72, 58, 88, 64, 78, 52];
}
