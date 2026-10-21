import { Signal } from '@angular/core';
import { OperatorCatalogue } from '../../../../core/models/filter';

/** Filter operators per column type, supplied by the store once fetched. */
export type CatalogueSource = Signal<OperatorCatalogue | null>;
