import { SchemaSource } from './schema-source';
import { CatalogueSource } from './catalogue-source';

export type ModelSources = {
  readonly schemas: SchemaSource;
  readonly catalogue: CatalogueSource;
};
