import { SchemaSource } from './schema-source';
import { CatalogueSource } from './catalogue-source';

/** The shared look-ups every model node needs to describe and validate itself. */
export interface ModelSources {
  readonly schemas: SchemaSource;
  readonly catalogue: CatalogueSource;
}
