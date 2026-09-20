import { DOCUMENT, Location } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Injectable, Signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { ReportApiService } from '../../../core/api/report-api.service';
import { ReportSharedView } from '../../../core/models/report';
import { NotificationService } from '../../../core/services/notification.service';
import { ReportViewerStore } from '../report-viewer.store';

const VIEW_PARAM = 'view';

function viewParam(): Signal<string | null> {
  const route = inject(ActivatedRoute);
  return toSignal(route.queryParamMap.pipe(map((params) => params.get(VIEW_PARAM))), {
    initialValue: route.snapshot.queryParamMap.get(VIEW_PARAM),
  });
}

/** A shared filter snapshot named by the URL's `?view=<short id>`, and turning the reader's filters into one. */
@Injectable()
export class SharedViewLink {
  public readonly id = viewParam();

  /** Undefined until the snapshot for the current id arrives; null when it doesn't exist. */
  public readonly filters = computed(() =>
    this.resource.hasValue() && this.resource.value().id === this.id() ? this.resource.value().filters : undefined,
  );
  public readonly loading = computed(() => this.resource.isLoading());
  /** Nothing to wait for when the URL names nothing. */
  public readonly settled = computed(
    () => !this.id() || this.filters() !== undefined || this.resource.error() != null,
  );
  /** Fetching failed, as opposed to the snapshot not existing. */
  public readonly lookupFailed = computed(
    () => !!this.id() && this.filters() === undefined && this.resource.error() != null,
  );

  private readonly store = inject(ReportViewerStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ReportApiService);
  private readonly notify = inject(NotificationService);
  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);
  private readonly resource = httpResource<ReportSharedView>(() => {
    const reportId = this.store.reportId();
    const id = this.id();
    return reportId && id ? `/api/reports/${reportId}/shared-views/${encodeURIComponent(id)}` : undefined;
  });

  /** The id the filters on screen reflect. A different one in the URL came from outside (back/forward). */
  private applied: string | null = null;

  public markApplied(id: string | null): void {
    this.applied = id;
  }

  public isApplied(): boolean {
    return this.id() === this.applied;
  }

  /** Removes `?view=` once it no longer describes the filters. */
  public drop(): void {
    this.applied = null;
    if (!this.id()) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [VIEW_PARAM]: null },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl: true,
    });
  }

  /** Copies a link to this report and tab. The filters go to the server for a short id, so the link carries no filter data. */
  public async copy(encoded: string | null): Promise<void> {
    const reportId = this.store.reportId();
    if (reportId === null) return;

    let viewId: string | null = null;
    if (encoded) {
      try {
        viewId = (await firstValueFrom(this.api.createSharedView(reportId, encoded))).id;
      } catch (err) {
        this.notify.apiError(err, "Couldn't create the link. Please try again.");
        return;
      }
    }

    try {
      await this.document.defaultView!.navigator.clipboard.writeText(this.linkTo(viewId));
      this.notify.success('Link copied to the clipboard.');
    } catch {
      this.notify.error("Couldn't copy the link to the clipboard.");
    }
  }

  private linkTo(viewId: string | null): string {
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { [VIEW_PARAM]: viewId },
      queryParamsHandling: 'merge',
    });
    return new URL(
      this.location.prepareExternalUrl(this.router.serializeUrl(tree)),
      this.document.location.origin,
    ).toString();
  }
}
