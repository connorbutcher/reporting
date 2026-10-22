import {
  DatasetColumnType,
  FormulaFunction,
  FormulaValueKind,
} from '../../../../../core/models/dataset';
import { LiteralBlock } from '../items/literal-block';
import { FunctionBlock } from '../items/function-block';
import { FormulaParameters } from '../parameters/formula-parameters';
import { TypedValue } from '../checker/typed-value';

/** The kinds of value a formula works with, and how they map to column types. */
export class ValueKinds {
  /** Short badge text for a kind. */
  public static readonly BADGES: Record<FormulaValueKind, string> = {
    any: 'any',
    number: '123',
    text: 'Abc',
    bool: 'T/F',
    date: 'date',
  };

  public static readonly LABELS: Record<FormulaValueKind, string> = {
    any: 'any value',
    number: 'a number',
    text: 'text',
    bool: 'a true/false value',
    date: 'a date',
  };

  public static ofColumnType(type: DatasetColumnType): FormulaValueKind {
    switch (type) {
      case 'int':
      case 'double':
        return 'number';
      case 'bool':
        return 'bool';
      case 'dateTime':
        return 'date';
      default:
        return 'text';
    }
  }

  /** The column type a formula of this kind naturally produces; null when the kind can't be told. */
  public static naturalColumnType(kind: FormulaValueKind): DatasetColumnType | null {
    switch (kind) {
      case 'number':
        return 'double';
      case 'text':
        return 'string';
      case 'bool':
        return 'bool';
      case 'date':
        return 'dateTime';
      default:
        return null;
    }
  }

  public static ofLiteral(item: LiteralBlock): FormulaValueKind {
    if (item.value === null) {
      return 'any';
    }

    switch (typeof item.value) {
      case 'number':
        return 'number';
      case 'boolean':
        return 'bool';
      default:
        return 'text';
    }
  }

  /**
   * For a function that returns whatever its `any` arguments are (IF, COALESCE): their shared kind, or `any`
   * if they differ. Arguments that are a bare NULL say nothing about the kind.
   */
  public static common(
    call: FunctionBlock,
    fn: FormulaFunction,
    kinds: readonly (TypedValue | null)[],
  ): FormulaValueKind {
    let common: FormulaValueKind | null = null;

    for (let index = 0; index < kinds.length; index++) {
      const typed = kinds[index];
      if (common === 'any') {
        break;
      }

      if (
        !typed ||
        typed.kind === 'any' ||
        FormulaParameters.forArgument(fn.parameters, index).kind !== 'any'
      ) {
        continue;
      }

      const expression = call.args[index];
      if (
        expression.length === 1 &&
        expression[0].kind === 'literal' &&
        expression[0].value === null
      ) {
        continue;
      }

      common = common === null || common === typed.kind ? typed.kind : 'any';
    }

    return common ?? 'any';
  }
}
