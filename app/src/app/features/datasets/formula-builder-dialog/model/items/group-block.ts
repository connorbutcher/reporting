import { Expression } from './expression';

/** Brackets around an expression, to make it a single value. */
export type GroupBlock = {
  kind: 'group';
  id: number;
  body: Expression;
};
