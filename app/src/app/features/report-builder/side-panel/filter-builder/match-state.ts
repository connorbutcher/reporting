import { DatasetCountResult } from '../../../../core/models/filter';

export type MatchState =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ready'; result: DatasetCountResult }
  | { state: 'error' };
