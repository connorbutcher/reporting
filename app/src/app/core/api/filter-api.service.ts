import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { OperatorCatalogue, OperatorsForType } from '../models/filter';

@Service()
export class FilterApiService {
  private readonly http = inject(HttpClient);

  /** Static for the life of the server, so one request serves every filter panel. */
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

  /** Which operators each column type supports. */
  public operators(): Observable<OperatorCatalogue> {
    return this.catalogue$;
  }
}
