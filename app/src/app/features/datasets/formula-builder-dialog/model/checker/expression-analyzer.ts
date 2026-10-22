import { FormulaParameter, FormulaValueKind } from '../../../../../core/models/dataset';
import { Expression } from '../items/expression';
import { FunctionBlock } from '../items/function-block';
import { OperandItem } from '../items/operand-item';
import { OperatorItem } from '../items/operator-item';
import { ValueKinds } from '../kinds/value-kinds';
import { FormulaParameters } from '../parameters/formula-parameters';
import { RpnFolder } from '../rpn/rpn-folder';
import { RpnConversion } from '../rpn/rpn-conversion';
import { OperatorTyping } from './operator-typing';
import { FormulaIssue } from './formula-issue';
import { FormulaScope } from './formula-scope';
import { TypedValue } from './typed-value';

/**
 * Checks expressions without the server. Each expression is put into reverse Polish notation, so a gap or
 * a doubled-up operator is found by the conversion itself, and then evaluated on a stack of *kinds* rather
 * than values: an operator pops the kinds of what it applies to and checks them, pushing the kind it
 * yields. Problems found are collected in {@link issues}.
 */
export class ExpressionAnalyzer implements RpnFolder<TypedValue> {
  public readonly issues: FormulaIssue[] = [];

  constructor(private readonly scope: FormulaScope) {}

  private static capitalise(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  public analyze(expression: Expression): TypedValue | null {
    if (expression.length === 0) {
      return null;
    }

    const rpn = RpnConversion.of(expression);
    for (const issue of rpn.issues) {
      this.issues.push({ kind: 'structure', blockId: issue.blockId, message: issue.message });
    }

    return RpnConversion.fold<TypedValue>(rpn.tokens, this)[0] ?? null;
  }

  public operand(item: OperandItem): TypedValue {
    switch (item.kind) {
      case 'column':
        return this.analyzeColumn(item.id, item.name);
      case 'literal':
        return { kind: ValueKinds.ofLiteral(item), first: item.id };
      case 'group':
        return this.analyzeGroup(item.id, item.body);
      case 'function':
        return { kind: this.analyzeCall(item), first: item.id };
    }
  }

  public missing(operatorId: number | null): TypedValue {
    return { kind: 'any', first: operatorId ?? 0 };
  }

  public unary(operator: OperatorItem, argument: TypedValue): TypedValue {
    return OperatorTyping.apply(operator, [argument], this.issues, argument.first);
  }

  public binary(operator: OperatorItem, left: TypedValue, right: TypedValue): TypedValue {
    return OperatorTyping.apply(operator, [left, right], this.issues, left.first);
  }

  private analyzeColumn(id: number, name: string): TypedValue {
    const column = this.scope.columns.get(name.toLowerCase());
    if (!column) {
      this.issues.push({
        kind: 'unknown',
        blockId: id,
        message: `There's no column named [${name}].`,
      });
    }

    return { kind: column ? ValueKinds.ofColumnType(column.type) : 'any', first: id };
  }

  private analyzeGroup(id: number, body: Expression): TypedValue {
    if (body.length === 0) {
      this.issues.push({ kind: 'structure', blockId: id, message: 'These brackets are empty.' });
    }

    return { kind: this.analyze(body)?.kind ?? 'any', first: id };
  }

  private analyzeCall(call: FunctionBlock): FormulaValueKind {
    const fn = this.scope.functions.get(call.name.toUpperCase());
    if (!fn) {
      this.issues.push({
        kind: 'unknown',
        blockId: call.id,
        message: `There's no function named ${call.name}.`,
      });
    }

    const argumentKinds: (TypedValue | null)[] = [];
    for (let index = 0; index < call.args.length; index++) {
      argumentKinds.push(this.analyzeArgument(call, index, fn?.parameters ?? []));
    }

    if (!fn) {
      return 'any';
    }

    return fn.returnKind === 'any' ? ValueKinds.common(call, fn, argumentKinds) : fn.returnKind;
  }

  private analyzeArgument(
    call: FunctionBlock,
    index: number,
    params: readonly FormulaParameter[],
  ): TypedValue | null {
    const expression = call.args[index];
    const param = params.length > 0 ? FormulaParameters.forArgument(params, index) : null;
    if (expression.length === 0) {
      if (param && !FormulaParameters.slotIsOptional(params, index)) {
        this.issues.push({
          kind: 'missing',
          blockId: call.id,
          ownerId: call.id,
          arg: index,
          message: `Add a value for ${param.name} in ${call.name}().`,
        });
      }
      return null;
    }

    const typed = this.analyze(expression);
    if (param && typed) {
      this.checkArgumentKind(call, index, param, typed);
    }
    return typed;
  }

  private checkArgumentKind(
    call: FunctionBlock,
    index: number,
    param: FormulaParameter,
    typed: TypedValue,
  ): void {
    if (param.kind === 'any' || typed.kind === 'any' || typed.kind === param.kind) {
      return;
    }
    this.issues.push({
      kind: 'type',
      blockId: typed.first,
      ownerId: call.id,
      arg: index,
      message: `${ExpressionAnalyzer.capitalise(param.name)} needs ${ValueKinds.LABELS[param.kind]}, but this is ${ValueKinds.LABELS[typed.kind]}.`,
    });
  }
}
