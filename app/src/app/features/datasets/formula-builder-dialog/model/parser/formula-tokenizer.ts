import { FormulaParseError } from './formula-parse-error';
import { FormulaToken } from './formula-token';

const OPERATOR_CHARS = '+-*/%^&=<>!';
const NUMBER_PATTERN = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*/;
const DIGIT = /[0-9]/;
const WHITESPACE = /\s/;
const NAME_START = /[A-Za-z_]/;

/** Splits formula text into tokens. */
export class FormulaTokenizer {
  private readonly tokens: FormulaToken[] = [];
  private position = 0;

  constructor(private readonly source: string) {}

  public tokenize(): FormulaToken[] {
    while (this.position < this.source.length) {
      this.readToken(this.source[this.position]);
    }

    this.tokens.push({ kind: 'end', text: '' });
    return this.tokens;
  }

  private readToken(c: string): void {
    if (WHITESPACE.test(c)) {
      this.position++;
    } else if (DIGIT.test(c) || (c === '.' && DIGIT.test(this.source[this.position + 1] ?? ''))) {
      this.readNumber();
    } else if (c === '"') {
      this.readText();
    } else if (c === '[') {
      this.readColumn();
    } else if (NAME_START.test(c)) {
      this.readName();
    } else if (c === '(') {
      this.single('open', c);
    } else if (c === ')') {
      this.single('close', c);
    } else if (c === ',') {
      this.single('comma', c);
    } else if (OPERATOR_CHARS.includes(c)) {
      this.readOperator(c);
    } else {
      throw new FormulaParseError(`Unexpected character '${c}'.`);
    }
  }

  private single(kind: FormulaToken['kind'], c: string): void {
    this.tokens.push({ kind, text: c });
    this.position++;
  }

  private readNumber(): void {
    const match = NUMBER_PATTERN.exec(this.source.slice(this.position))!;
    this.tokens.push({ kind: 'number', text: match[0], number: Number(match[0]) });
    this.position += match[0].length;
  }

  private readText(): void {
    let text = '';
    this.position++;

    for (;;) {
      if (this.position >= this.source.length) {
        throw new FormulaParseError('A piece of text is missing its closing quote.');
      }

      if (this.source[this.position] === '"') {
        if (this.source[this.position + 1] === '"') {
          text += '"';
          this.position += 2;
          continue;
        }

        this.position++;
        break;
      }

      text += this.source[this.position++];
    }

    this.tokens.push({ kind: 'text', text });
  }

  private readColumn(): void {
    const close = this.source.indexOf(']', this.position);
    if (close < 0) {
      throw new FormulaParseError("A column reference is missing its closing ']'.");
    }

    this.tokens.push({ kind: 'column', text: this.source.slice(this.position + 1, close).trim() });
    this.position = close + 1;
  }

  private readName(): void {
    const match = NAME_PATTERN.exec(this.source.slice(this.position))!;
    this.tokens.push({ kind: 'name', text: match[0] });
    this.position += match[0].length;
  }

  private readOperator(c: string): void {
    const two = this.source.slice(this.position, this.position + 2);

    if (two === '<>' || two === '<=' || two === '>=') {
      this.tokens.push({ kind: 'operator', text: two });
      this.position += 2;
    } else if (two === '!=') {
      this.tokens.push({ kind: 'operator', text: '<>' });
      this.position += 2;
    } else if (two === '==') {
      this.tokens.push({ kind: 'operator', text: '=' });
      this.position += 2;
    } else if (c === '!') {
      throw new FormulaParseError("Unexpected character '!'.");
    } else {
      this.tokens.push({ kind: 'operator', text: c });
      this.position++;
    }
  }
}
