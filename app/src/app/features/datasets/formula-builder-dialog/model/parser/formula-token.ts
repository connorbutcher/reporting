export interface FormulaToken {
  kind: 'number' | 'text' | 'column' | 'name' | 'operator' | 'open' | 'close' | 'comma' | 'end';
  text: string;
  number?: number;
}
