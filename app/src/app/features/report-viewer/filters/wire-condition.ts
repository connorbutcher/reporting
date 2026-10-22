export type WireCondition =
  | [columnId: string, operator: string, values: string[]]
  | [columnId: string, operator: string, values: string[], disabled: 0];
