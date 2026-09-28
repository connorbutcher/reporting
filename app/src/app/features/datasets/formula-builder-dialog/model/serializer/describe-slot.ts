import { parametersOf } from '../checker/parameters-of';
import { FormulaScope } from '../checker/formula-scope';
import { FunctionBlock } from '../items/function-block';
import { parameterFor, slotIsOptional } from '../parameters/parameter-lookup';
import { SlotDescription } from './slot-description';

/** What the serializer needs to know about a call's argument: its name for a placeholder, and whether it may be left out. */
export function describeSlot(scope: FormulaScope, call: FunctionBlock, index: number): SlotDescription {
  const params = parametersOf(call, scope);
  if (params.length === 0) {
    return { name: 'value', optional: false };
  }

  return { name: parameterFor(params, index).name, optional: slotIsOptional(params, index) };
}
