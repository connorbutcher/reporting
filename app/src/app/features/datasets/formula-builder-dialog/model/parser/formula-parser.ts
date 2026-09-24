import { FormulaFunction } from '../../../../../core/models/dataset';
import { emptyArguments, functionBlock, columnBlock, groupBlock, literalBlock, operatorItem } from '../factory/item-factory';
import { Expression } from '../items/expression';
import { FormulaItem } from '../items/formula-item';
import { FormulaParseError } from './formula-parse-error';
import { FormulaToken } from './formula-token';

const COMPARISONS = new Set(['=', '<>', '<', '<=', '>', '>=']);

/**
 * Reads formula text back into the builder's expression, for opening a saved formula. It follows the
 * server's grammar but keeps only the *order* of what it reads — values and operators in a sequence — since
 * that is all the builder holds; the precedence that gave the text its shape is applied again, by reverse
 * Polish notation, wherever the sequence is used. Brackets the user wrote stay as groups.
 */
export class FormulaParser {
  private index = 0;

  constructor(
    private readonly tokens: FormulaToken[],
    private readonly functions: ReadonlyMap<string, FormulaFunction>,
  ) {}

  public parse(): FormulaItem[] {
    const root = this.or();
    if (this.current.kind !== 'end') {
      throw new FormulaParseError(`Unexpected '${this.current.text}'.`);
    }

    return root;
  }

  private isKind(kind: FormulaToken['kind']): boolean {
    return this.current.kind === kind;
  }

  private isName(word: string): boolean {
    return this.current.kind === 'name' && this.current.text.toUpperCase() === word && this.tokens[this.index + 1].kind !== 'open';
  }

  private isOperator(...ops: string[]): boolean {
    return this.current.kind === 'operator' && ops.includes(this.current.text);
  }

  private or(): FormulaItem[] {
    let left = this.and();
    while (this.isName('OR')) {
      this.index++;
      left = [...left, operatorItem('OR'), ...this.and()];
    }

    return left;
  }

  private and(): FormulaItem[] {
    let left = this.not();
    while (this.isName('AND')) {
      this.index++;
      left = [...left, operatorItem('AND'), ...this.not()];
    }

    return left;
  }

  private not(): FormulaItem[] {
    if (this.isName('NOT')) {
      this.index++;
      return [operatorItem('NOT'), ...this.not()];
    }

    return this.comparison();
  }

  private comparison(): FormulaItem[] {
    const left = this.concat();
    if (this.current.kind === 'operator' && COMPARISONS.has(this.current.text)) {
      const op = this.tokens[this.index++].text;
      return [...left, operatorItem(op), ...this.concat()];
    }

    return left;
  }

  private concat(): FormulaItem[] {
    let left = this.additive();
    while (this.isOperator('&')) {
      this.index++;
      left = [...left, operatorItem('&'), ...this.additive()];
    }

    return left;
  }

  private additive(): FormulaItem[] {
    let left = this.multiplicative();
    while (this.isOperator('+', '-')) {
      const op = this.tokens[this.index++].text;
      left = [...left, operatorItem(op), ...this.multiplicative()];
    }

    return left;
  }

  private multiplicative(): FormulaItem[] {
    let left = this.unary();
    while (this.isOperator('*', '/', '%')) {
      const op = this.tokens[this.index++].text;
      left = [...left, operatorItem(op), ...this.unary()];
    }

    return left;
  }

  private unary(): FormulaItem[] {
    if (this.isOperator('-', '+')) {
      const sign = this.tokens[this.index++].text;
      const operand = this.unary();
      return sign === '+' ? operand : [operatorItem('-'), ...operand];
    }

    return this.power();
  }

  private power(): FormulaItem[] {
    const left = this.primary();
    if (this.isOperator('^')) {
      this.index++;
      return [...left, operatorItem('^'), ...this.unary()];
    }

    return left;
  }

  private primary(): FormulaItem[] {
    const token = this.tokens[this.index++];

    switch (token.kind) {
      case 'number':
        return [literalBlock(token.number!)];
      case 'text':
        return [literalBlock(token.text)];
      case 'column':
        return [columnBlock(token.text)];
      case 'open':
        return [this.group()];
      case 'name':
        return [this.name(token)];
      case 'end':
        throw new FormulaParseError('The formula ends unexpectedly; a value is missing.');
      default:
        throw new FormulaParseError(`Unexpected '${token.text}'.`);
    }
  }

  private group(): FormulaItem {
    const inner = this.or();
    if (!this.isKind('close')) {
      throw new FormulaParseError("A bracket is missing its closing ')'.");
    }

    this.index++;
    return groupBlock(inner);
  }

  private name(token: FormulaToken): FormulaItem {
    if (!this.isKind('open')) {
      return this.keyword(token);
    }

    this.index++; // (
    const args = this.callArguments();
    if (!this.isKind('close')) {
      throw new FormulaParseError(`${token.text.toUpperCase()}( is missing its closing ')'.`);
    }

    this.index++;

    const name = token.text.toUpperCase();
    const fn = this.functions.get(name);

    // Pad to the arguments the function needs, so a formula saved with fewer shows the rest as gaps to fill.
    const wanted = emptyArguments(fn).length;
    while (args.length < wanted) {
      args.push([]);
    }

    return functionBlock(fn, name, args);
  }

  private keyword(token: FormulaToken): FormulaItem {
    const word = token.text.toUpperCase();

    if (word === 'TRUE') {
      return literalBlock(true);
    }

    if (word === 'FALSE') {
      return literalBlock(false);
    }

    if (word === 'NULL') {
      return literalBlock(null);
    }

    throw new FormulaParseError(`'${token.text}' isn't a value or function call. Column names go in [square brackets].`);
  }

  private callArguments(): Expression[] {
    const args: Expression[] = [];
    if (this.isKind('close')) {
      return args;
    }

    for (;;) {
      args.push(this.or());
      if (!this.isKind('comma')) {
        break;
      }

      this.index++;
    }

    return args;
  }

  private get current(): FormulaToken {
    return this.tokens[this.index];
  }
}
