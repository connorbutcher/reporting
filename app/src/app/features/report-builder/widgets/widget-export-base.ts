import { Directive, ElementRef, inject } from '@angular/core';
import { toPng } from 'html-to-image';

/**
 * Base every exportable widget extends, so "download a screenshot" and
 * "download the data as CSV" are one contract instead of each widget growing
 * its own copy. Subclasses are forced to say what their data is (`exportCsv`)
 * and what to call the file (`exportName`); screenshotting defaults to
 * rasterizing the widget's own host element (right for the DOM-rendered table
 * and pivot), and a chart overrides {@link downloadScreenshot} to grab its
 * echarts canvas directly instead, which is both cheaper and sharper.
 */
@Directive()
export abstract class WidgetExportBase {
  private readonly exportHost: ElementRef<HTMLElement> = inject(ElementRef);

  /** The base filename (without extension) — typically the widget's title. */
  protected abstract exportName(): string;

  /** CSV text for the widget's current data, or null when there's nothing to export yet. */
  protected abstract exportCsv(): string | null;

  /** Saves the widget's current data as a CSV file. */
  public downloadCsv(): void {
    const csv = this.exportCsv();
    if (csv === null) return;
    this.downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${this.exportName()}.csv`);
  }

  /** Saves a screenshot of the widget as a PNG. Charts override this to export their canvas directly. */
  public async downloadScreenshot(): Promise<void> {
    const dataUrl = await toPng(this.exportHost.nativeElement, { pixelRatio: 2, backgroundColor: '#fff' });
    this.downloadUrl(dataUrl, `${this.exportName()}.png`);
  }

  /** Downloads a blob, then releases its object URL once the download has had a beat to start. */
  protected downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    this.downloadUrl(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Clicks a transient anchor to save `url` under `filename`, then discards it. */
  protected downloadUrl(url: string, filename: string): void {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  }
}
