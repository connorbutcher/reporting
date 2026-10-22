import { Expression } from './expression';

/** A call to a catalogue function. Each argument is an expression of its own. */
export type FunctionBlock = {
  kind: 'function';
  id: number;
  name: string;
  args: Expression[];
};
