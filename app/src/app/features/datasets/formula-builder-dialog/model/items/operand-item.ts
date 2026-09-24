import { ColumnBlock } from './column-block';
import { FunctionBlock } from './function-block';
import { GroupBlock } from './group-block';
import { LiteralBlock } from './literal-block';

/** An item that stands for a value. */
export type OperandItem = ColumnBlock | LiteralBlock | FunctionBlock | GroupBlock;
