import { SchemaSource } from './schema-source';
import { CatalogueSource } from './catalogue-source';

export interface ModelSources {
  readonly schemas: SchemaSource;
  readonly catalogue: CatalogueSource;
}
