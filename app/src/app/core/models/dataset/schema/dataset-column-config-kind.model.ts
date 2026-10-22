/**
 * The display-configuration shape a column formats through. Several column types
 * share a shape (int and double are both `numeric`), so config is keyed by this
 * kind rather than by the column type directly. Mirrors the API's
 * `DatasetColumnConfigKind` and doubles as the discriminator of the union below.
 */
export type DatasetColumnConfigKind = 'numeric' | 'date' | 'bool' | 'text';
