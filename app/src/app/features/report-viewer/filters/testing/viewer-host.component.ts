import { Component, inject } from '@angular/core';
import { ReportViewerStore } from '../../report-viewer.store';
import { SavedViewFilters } from '../saved-view-filters';
import { SharedViewLink } from '../shared-view-link';
import { ViewFilterSchemas } from '../view-filter-schemas';
import { ViewFilterSession } from '../view-filter-session';

@Component({
  template: '',
  providers: [
    ReportViewerStore,
    ViewFilterSchemas,
    SavedViewFilters,
    SharedViewLink,
    ViewFilterSession,
  ],
})
export class ViewerHostComponent {
  public readonly session = inject(ViewFilterSession);
}
