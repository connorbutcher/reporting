import { Component, input } from '@angular/core';

/** The silhouette a loading chart hints at: columns for the aggregating charts, a trend for scatter and line. */
export type ChartSkeletonShape = 'bars' | 'line';

/**
 * A placeholder drawn where a chart will be on its first load — axes and a softly pulsing outline of
 * the chart's shape — so the widget keeps its size and character instead of collapsing to a spinner
 * and jumping when the real chart arrives. Motion is dropped for readers who ask for less of it.
 */
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

  /** Varied heights so it reads as a chart rather than a block. */
  public readonly barHeights = [46, 72, 58, 88, 64, 78, 52];
}
