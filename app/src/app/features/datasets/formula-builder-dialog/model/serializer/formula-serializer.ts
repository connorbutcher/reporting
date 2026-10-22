import { Expression } from '../items/expression';
import { FunctionBlock } from '../items/function-block';
import { FormulaWriter } from './formula-writer';
import { SerializedFormula } from './serialized-formula';
import { SlotDescription } from './slot-description';
import { FormulaChecker } from '../checker/formula-checker';
import { FormulaScope } from '../checker/formula-scope';
import { FormulaParameters } from '../parameters/formula-parameters';
import { BlockSpan } from './block-span';

/** Writes formulas as the text the server's parser reads. */
export class FormulaSerializer {
  /** Writes the formula as text, the way the server's parser reads it (see {@link FormulaWriter}). */
  public static serialize(
    root: Expression,
    describe: (call: FunctionBlock, index: number) => SlotDescription,
  ): SerializedFormula {
    return new FormulaWriter(describe).write(root);
  }

  /** What the serializer needs to know about a call's argument: its name for a placeholder, and whether it may be left out. */
  public static describeSlot(
    scope: FormulaScope,
    call: FunctionBlock,
    index: number,
  ): SlotDescription {
    const params = FormulaChecker.parametersOf(call, scope);
    if (params.length === 0) {
      return { name: 'value', optional: false };
    }

    return {
      name: FormulaParameters.forArgument(params, index).name,
      optional: FormulaParameters.slotIsOptional(params, index),
    };
  }

  /** The innermost item whose text contains `position` — where a server error at that offset belongs. */
  public static blockAtPosition(
    spans: ReadonlyMap<number, BlockSpan>,
    position: number,
  ): number | null {
    let best: number | null = null;
    let bestLength = Infinity;

    for (const [id, span] of spans) {
      const length = span.end - span.start;
      if (
        position >= span.start &&
        position < Math.max(span.end, span.start + 1) &&
        length < bestLength
      ) {
        best = id;
        bestLength = length;
      }
    }

    return best;
  }
}
