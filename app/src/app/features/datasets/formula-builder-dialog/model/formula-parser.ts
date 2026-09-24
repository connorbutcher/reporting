import { FormulaFunction } from '../../../../core/models/dataset';
import {
  Expression,
  FormulaItem,
  columnBlock,
  emptyArguments,
  functionBlock,
  groupBlock,
  literalBlock,
  operatorItem,
} from './formula-block';

/** The formula text couldn't be read back into blocks. */
export class FormulaParseError extends Error {}

interface Token {
  kind: 'number' | 'text' | 'column' | 'name' | 'operator' | 'open' | 'close' | 'comma' | 'end';
  text: string;
  number?: number;
}

const OPERATOR_CHARS = '+-*/%^&=<>!';
const COMPARISONS = new Set(['=', '<>', '<', '<=', '>', '>=']);

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(source[i + 1] ?? ''))) {
      const match = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(source.slice(i))!;
      tokens.push({ kind: 'number', text: match[0], number: Number(match[0]) });
      i += match[0].length;
    } else if (c === '"') {
      let text = '';
      i++;
      for (;;) {
        if (i >= source.length) throw new FormulaParseError('A piece of text is missing its closing quote.');
        if (source[i] === '"') {
          if (source[i + 1] === '"') {
            text += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        text += source[i++];
      }
      tokens.push({ kind: 'text', text });
    } else if (c === '[') {
      const close = source.indexOf(']', i);
      if (close < 0) throw new FormulaParseError("A column reference is missing its closing ']'.");
      tokens.push({ kind: 'column', text: source.slice(i + 1, close).trim() });
      i = close + 1;
    } else if (/[A-Za-z_]/.test(c)) {
      const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(i))!;
      tokens.push({ kind: 'name', text: match[0] });
      i += match[0].length;
    } else if (c === '(') {
      tokens.push({ kind: 'open', text: c });
      i++;
    } else if (c === ')') {
      tokens.push({ kind: 'close', text: c });
      i++;
    } else if (c === ',') {
      tokens.push({ kind: 'comma', text: c });
      i++;
    } else if (OPERATOR_CHARS.includes(c)) {
      const two = source.slice(i, i + 2);
      if (two === '<>' || two === '<=' || two === '>=') {
        tokens.push({ kind: 'operator', text: two });
        i += 2;
      } else if (two === '!=') {
        tokens.push({ kind: 'operator', text: '<>' });
        i += 2;
      } else if (two === '==') {
        tokens.push({ kind: 'operator', text: '=' });
        i += 2;
      } else if (c === '!') {
        throw new FormulaParseError("Unexpected character '!'.");
      } else {
        tokens.push({ kind: 'operator', text: c });
        i++;
      }
    } else {
      throw new FormulaParseError(`Unexpected character '${c}'.`);
    }
  }
  tokens.push({ kind: 'end', text: '' });
  return tokens;
}

/**
 * Reads formula text back into the builder's expression, for opening a saved formula. It follows the
 * server's grammar but keeps only the *order* of what it reads — values and operators in a sequence — since
 * that is all the builder holds; the precedence that gave the text its shape is applied again, by reverse
 * Polish notation, wherever the sequence is used. Brackets the user wrote stay as groups.
 */
export function parseFormula(source: string, functions: ReadonlyMap<string, FormulaFunction>): Expression {
  if (!source.trim()) return [];
  return new Parser(tokenize(source), functions).parse();
}

class Parser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly functions: ReadonlyMap<string, FormulaFunction>,
  ) {}

  public parse(): FormulaItem[] {
    const root = this.or();
    if (this.current.kind !== 'end') throw new FormulaParseError(`Unexpected '${this.current.text}'.`);
    return root;
  }

  private isKind(kind: Token['kind']): boolean {
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
      case 'open': {
        const inner = this.or();
        if (!this.isKind('close')) throw new FormulaParseError("A bracket is missing its closing ')'.");
        this.index++;
        return [groupBlock(inner)];
      }
      case 'name':
        return [this.name(token)];
      case 'end':
        throw new FormulaParseError('The formula ends unexpectedly; a value is missing.');
      default:
        throw new FormulaParseError(`Unexpected '${token.text}'.`);
    }
  }

  private name(token: Token): FormulaItem {
    if (!this.isKind('open')) {
      const word = token.text.toUpperCase();
      if (word === 'TRUE') return literalBlock(true);
      if (word === 'FALSE') return literalBlock(false);
      if (word === 'NULL') return literalBlock(null);
      throw new FormulaParseError(`'${token.text}' isn't a value or function call. Column names go in [square brackets].`);
    }

    this.index++; // (
    const args: Expression[] = [];
    if (!this.isKind('close')) {
      for (;;) {
        args.push(this.or());
        if (!this.isKind('comma')) break;
        this.index++;
      }
    }
    if (!this.isKind('close')) throw new FormulaParseError(`${token.text.toUpperCase()}( is missing its closing ')'.`);
    this.index++;

    const name = token.text.toUpperCase();
    const fn = this.functions.get(name);
    // Pad to the arguments the function needs, so a formula saved with fewer shows the rest as gaps to fill.
    const padded = [...args];
    const wanted = emptyArguments(fn).length;
    while (padded.length < wanted) padded.push([]);
    return functionBlock(fn, name, padded);
  }

  private get current(): Token {
    return this.tokens[this.index];
  }
}
