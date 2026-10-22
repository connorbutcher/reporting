import { Directive, ElementRef, inject } from '@angular/core';
import { toPng } from 'html-to-image';

/**
 * The screenshot, CSV export and "View data" contract for widgets. Screenshots rasterize the host element by
 * default; charts override {@link downloadScreenshot} to use their canvas.
 */
@Directive()
export abstract class WidgetExportBase {
  private readonly exportHost: ElementRef<HTMLElement> = inject(ElementRef);

  /** The base filename, typically the widget's title. */
  public abstract exportName(): string;

  /** CSV for the widget's data, or null when there's nothing yet. May fetch rows not on screen. */
  public abstract exportCsv(): string | null | Promise<string | null>;

  /** Whether {@link openDataView} has values to show. Only charts offer it. */
  public canViewData(): boolean {
    return false;
  }

  /** Shows the widget's values in a dialog; a no-op unless {@link canViewData}. */
  public openDataView(): void {
    return;
  }

  public async downloadCsv(): Promise<void> {
    const csv = await this.exportCsv();
    if (csv === null) {
      return;
    }
    // A BOM stops Excel mangling non-ASCII characters such as £ or µ.
    const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: 'text/csv;charset=utf-8' });
    this.downloadBlob(blob, `${this.exportName()}.csv`);
  }

  public async downloadScreenshot(): Promise<void> {
    const dataUrl = await toPng(this.exportHost.nativeElement, {
      pixelRatio: 2,
      backgroundColor: '#fff',
    });
    this.downloadUrl(dataUrl, `${this.exportName()}.png`);
  }

  /** Releases the object URL once the download has had a moment to start. */
  public downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    this.downloadUrl(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  public downloadUrl(url: string, filename: string): void {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  }
}
