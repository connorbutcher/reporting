import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatasetApiService } from '../../../core/api/dataset-api.service';
import { ReportApiService } from '../../../core/api/report-api.service';
import { DatasetSummary } from '../../../core/models/dataset.model';
import { Report, Widget } from '../../../core/models/report.model';
import { CELL_SIZE, GRID_COLUMNS, GRID_GAP } from '../grid.util';
import { WidgetHostComponent } from '../widget-host/widget-host.component';

const DEFAULT_WIDGET_W = 4;
const DEFAULT_WIDGET_H = 3;

@Component({
  selector: 'app-report-canvas',
  imports: [WidgetHostComponent],
  templateUrl: './report-canvas.component.html',
  styleUrl: './report-canvas.component.scss',
})
export class ReportCanvasComponent implements OnInit {
  private readonly reportApi = inject(ReportApiService);
  private readonly datasetApi = inject(DatasetApiService);

  protected readonly report = signal<Report | null>(null);
  protected readonly widgets = computed(() => this.report()?.widgets ?? []);
  protected readonly datasets = signal<DatasetSummary[]>([]);
  protected readonly pickerOpen = signal(false);
  protected readonly loading = signal(true);

  protected readonly gridColumns = GRID_COLUMNS;
  protected readonly cellSize = CELL_SIZE;
  protected readonly gridGap = GRID_GAP;

  ngOnInit(): void {
    this.datasetApi.list().subscribe((datasets) => this.datasets.set(datasets));

    this.reportApi.list().subscribe((reports) => {
      if (reports.length > 0) {
        this.report.set(reports[0]);
        this.loading.set(false);
      } else {
        this.reportApi.create('Demo Report').subscribe((report) => {
          this.report.set(report);
          this.loading.set(false);
        });
      }
    });
  }

  protected openPicker(): void {
    this.pickerOpen.set(true);
  }

  protected closePicker(): void {
    this.pickerOpen.set(false);
  }

  protected addWidget(datasetId: string): void {
    const report = this.report();
    if (!report) return;

    const nextY = report.widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
    const widget: Widget = {
      id: crypto.randomUUID(),
      type: 'dataTable',
      x: 0,
      y: nextY,
      w: DEFAULT_WIDGET_W,
      h: DEFAULT_WIDGET_H,
      config: { type: 'dataTable', datasetId },
    };

    this.persist({ ...report, widgets: [...report.widgets, widget] });
    this.closePicker();
  }

  protected onWidgetChange(updated: Widget): void {
    const report = this.report();
    if (!report) return;

    const widgets = report.widgets.map((w) => (w.id === updated.id ? updated : w));
    this.persist({ ...report, widgets });
  }

  protected otherWidgets(widget: Widget): Widget[] {
    return this.widgets().filter((w) => w.id !== widget.id);
  }

  private persist(report: Report): void {
    this.report.set(report);
    this.reportApi.update(report).subscribe();
  }
}
