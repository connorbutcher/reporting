import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { DatasetColumnType } from '../models/dataset.model';
import { OperatorCatalogue, OperatorsForType } from '../models/filter.model';

@Service()
export class FilterApiService {
  private readonly http = inject(HttpClient);

  /**
   * Which operators each column type supports. The catalogue is static for the
   * life of the server, so one request is shared by every filter panel.
   */
  private readonly catalogue$: Observable<OperatorCatalogue> = this.http
    .get<OperatorsForType[]>('/api/filters/operators')
    .pipe(
      map((entries) => {
        const catalogue = {} as OperatorCatalogue;
        for (const entry of entries) catalogue[entry.type] = entry.operators;
        return catalogue;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  operators(): Observable<OperatorCatalogue> {
    return this.catalogue$;
  }

  /** Operators valid for one column type, or an empty list before the catalogue arrives. */
  static operatorsFor(catalogue: OperatorCatalogue | null, type: DatasetColumnType | undefined) {
    return type && catalogue ? (catalogue[type] ?? []) : [];
  }
}
