export interface DatasetChip {
  readonly id: number;
  readonly name: string;
  readonly count: number;
  /** The chip's accessible name: dataset and conditions. */
  readonly label: string;
}
