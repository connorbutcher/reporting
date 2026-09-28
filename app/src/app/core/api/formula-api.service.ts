import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import {
  DatasetColumn,
  DatasetSchema,
  FormulaFunction,
  FormulaPreview,
  FormulaPreviewRequest,
  SaveFormulaColumn,
} from '../models/dataset';

@Service()
export class FormulaApiService {
  private readonly http = inject(HttpClient);

  /** Read from the server's database; stable within a session, so one request serves every builder. */
  private readonly functions$: Observable<FormulaFunction[]> = this.http
    .get<FormulaFunction[]>('/api/formulas/functions')
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  /** The functions a formula can call right now. */
  public functions(): Observable<FormulaFunction[]> {
    return this.functions$;
  }

  /** Checks an unsaved formula and evaluates it on a sample of rows, saving nothing. */
  public preview(datasetId: number, request: FormulaPreviewRequest): Observable<FormulaPreview> {
    return this.http.post<FormulaPreview>(`/api/datasets/${datasetId}/formula/preview`, request);
  }

  public addColumn(datasetId: number, column: SaveFormulaColumn): Observable<DatasetColumn> {
    return this.http.post<DatasetColumn>(`/api/datasets/${datasetId}/columns/formula`, column);
  }

  public updateColumn(
    datasetId: number,
    columnId: string,
    column: SaveFormulaColumn,
  ): Observable<DatasetColumn> {
    return this.http.put<DatasetColumn>(`/api/datasets/${datasetId}/columns/${columnId}/formula`, column);
  }

  /** Recomputes every formula column — for after the function catalogue changed. */
  public recalculate(datasetId: number): Observable<DatasetSchema> {
    return this.http.post<DatasetSchema>(`/api/datasets/${datasetId}/formula/recalculate`, {});
  }
}
