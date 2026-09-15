/**
 * The drag-and-drop formula builder's block model. A formula is a flat left-to-right sequence of
 * blocks — columns, literals and operators — with a function block's argument slots each holding
 * their own flat sequence. Deliberately shallow: a slot never holds another function block, so the
 * canvas never needs a general nested-block editor. Precedence (e.g. `*` binding tighter than `+`)
 * is resolved server-side when the sequence is serialized to text and parsed there, exactly as if
 * it had been typed — the same rule a flat infix expression follows without parentheses.
 *
 * Chained formula logic that would need real nesting goes through one formula column referencing
 * another instead (already supported server-side via the dependency graph), not deeper blocks here.
 */
export type FormulaOperator =
  '+' | '-' | '*' | '/' | '=' | '<>' | '<' | '<=' | '>' | '>=' | 'AND' | 'OR' | 'NOT';

export type FormulaBlock =
  | { id: string; kind: 'column'; columnId: string; columnName: string }
  | { id: string; kind: 'number'; value: number }
  | { id: string; kind: 'text'; value: string }
  | { id: string; kind: 'bool'; value: boolean }
  | { id: string; kind: 'operator'; op: FormulaOperator }
  | { id: string; kind: 'function'; name: string; args: FormulaBlock[][] };

let nextId = 0;
/** A unique-enough id for a block's lifetime in the builder (drag tracking, `@for` track). */
export function newBlockId(): string {
  nextId += 1;
  return `b${nextId}`;
}

export function columnBlock(columnId: string, columnName: string): FormulaBlock {
  return { id: newBlockId(), kind: 'column', columnId, columnName };
}
export function numberBlock(value = 0): FormulaBlock {
  return { id: newBlockId(), kind: 'number', value };
}
export function textBlock(value = ''): FormulaBlock {
  return { id: newBlockId(), kind: 'text', value };
}
export function boolBlock(value = true): FormulaBlock {
  return { id: newBlockId(), kind: 'bool', value };
}
export function operatorBlock(op: FormulaOperator): FormulaBlock {
  return { id: newBlockId(), kind: 'operator', op };
}
export function functionBlock(name: string, slotCount: number): FormulaBlock {
  return {
    id: newBlockId(),
    kind: 'function',
    name,
    args: Array.from({ length: slotCount }, () => []),
  };
}

// --- serialize: blocks -> the same text a person could have typed -----------------------------

export function serializeFormula(blocks: readonly FormulaBlock[]): string {
  return blocks.map(serializeBlock).join(' ');
}

function serializeBlock(block: FormulaBlock): string {
  switch (block.kind) {
    case 'column':
      return `[${block.columnName}]`;
    case 'number':
      return String(block.value);
    case 'text':
      return `"${block.value.replace(/"/g, '""')}"`;
    case 'bool':
      return block.value ? 'TRUE' : 'FALSE';
    case 'operator':
      return block.op;
    case 'function':
      return `${block.name}(${block.args.map(serializeFormula).join(', ')})`;
  }
}

// --- deserialize: existing formula text -> blocks, for editing --------------------------------

interface Token {
  kind: 'number' | 'string' | 'columnRef' | 'identifier' | 'symbol' | 'end';
  text: string;
}

const OPERATOR_SYMBOLS = new Set(['+', '-', '*', '/', '=', '<>', '<', '<=', '>', '>=']);
const KEYWORD_OPERATORS = new Set(['AND', 'OR', 'NOT']);

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expression.length) {
    const c = expression[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '[') {
      const close = expression.indexOf(']', i + 1);
      if (close < 0) throw new Error("Unterminated column reference — missing ']'.");
      tokens.push({ kind: 'columnRef', text: expression.slice(i + 1, close).trim() });
      i = close + 1;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let text = '';
      while (j < expression.length && expression[j] !== '"') {
        if (expression[j] === '"' && expression[j + 1] === '"') {
          text += '"';
          j += 2;
          continue;
        }
        text += expression[j];
        j++;
      }
      if (j >= expression.length) throw new Error('Unterminated string literal.');
      tokens.push({ kind: 'string', text });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(expression[i + 1] ?? ''))) {
      let j = i;
      let sawDot = false;
      while (
        j < expression.length &&
        (/[0-9]/.test(expression[j]) || (expression[j] === '.' && !sawDot))
      ) {
        if (expression[j] === '.') sawDot = true;
        j++;
      }
      tokens.push({ kind: 'number', text: expression.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < expression.length && /[A-Za-z0-9_]/.test(expression[j])) j++;
      tokens.push({ kind: 'identifier', text: expression.slice(i, j) });
      i = j;
      continue;
    }
    if ((c === '<' || c === '>') && expression[i + 1] === '=') {
      tokens.push({ kind: 'symbol', text: expression.slice(i, i + 2) });
      i += 2;
      continue;
    }
    if (c === '<' && expression[i + 1] === '>') {
      tokens.push({ kind: 'symbol', text: '<>' });
      i += 2;
      continue;
    }
    if ('+-*/(),=<>'.includes(c)) {
      tokens.push({ kind: 'symbol', text: c });
      i++;
      continue;
    }
    throw new Error(`Unexpected character '${c}'.`);
  }
  tokens.push({ kind: 'end', text: '' });
  return tokens;
}

/**
 * Reconstructs the block sequence a formula's text represents, for opening the builder on an
 * existing formula. Only understands what this builder itself can produce — flat sequences and
 * function calls, no bare grouping parentheses — since the palette never offers a way to create
 * those; a formula containing one (however it was authored) is reported as unrepresentable rather
 * than silently misread.
 */
export function deserializeFormula(expression: string): FormulaBlock[] {
  const tokens = tokenize(expression);
  let pos = 0;

  const peek = () => tokens[pos];
  const isSymbol = (text: string) => peek().kind === 'symbol' && peek().text === text;
  const expectSymbol = (text: string) => {
    if (!isSymbol(text))
      throw new Error(`Expected '${text}' but found '${peek().text || 'end of formula'}'.`);
    pos++;
  };

  function readSequence(stopSymbols: ReadonlySet<string>): FormulaBlock[] {
    const blocks: FormulaBlock[] = [];
    while (peek().kind !== 'end' && !(peek().kind === 'symbol' && stopSymbols.has(peek().text))) {
      blocks.push(readOne());
    }
    return blocks;
  }

  function readOne(): FormulaBlock {
    const t = peek();

    if (t.kind === 'number') {
      pos++;
      return numberBlock(Number(t.text));
    }
    if (t.kind === 'string') {
      pos++;
      return textBlock(t.text);
    }
    if (t.kind === 'columnRef') {
      pos++;
      return columnBlock('', t.text); // columnId resolved against the dataset afterwards
    }
    if (t.kind === 'identifier') {
      const word = t.text.toUpperCase();
      if (word === 'TRUE' || word === 'FALSE') {
        pos++;
        return boolBlock(word === 'TRUE');
      }
      if (KEYWORD_OPERATORS.has(word)) {
        pos++;
        return operatorBlock(word as FormulaOperator);
      }
      // A bare identifier not followed by "(" isn't anything this builder can produce.
      pos++;
      expectSymbol('(');
      const args: FormulaBlock[][] = [];
      if (!isSymbol(')')) {
        args.push(readSequence(new Set([',', ')'])));
        while (isSymbol(',')) {
          pos++;
          args.push(readSequence(new Set([',', ')'])));
        }
      }
      expectSymbol(')');
      return { id: newBlockId(), kind: 'function', name: word, args };
    }
    if (t.kind === 'symbol' && OPERATOR_SYMBOLS.has(t.text)) {
      pos++;
      return operatorBlock(t.text as FormulaOperator);
    }
    if (t.kind === 'symbol' && t.text === '(') {
      throw new Error(
        "This formula uses grouping parentheses, which the visual builder can't display.",
      );
    }
    throw new Error(`Unexpected '${t.text || 'end of formula'}'.`);
  }

  const blocks = readSequence(new Set());
  if (peek().kind !== 'end') throw new Error(`Unexpected '${peek().text}'.`);
  return blocks;
}

/** Fills in each column block's `columnId` by matching its name against the dataset's current
 * columns (case-insensitive) — `deserializeFormula` only has the name from the formula text. A
 * name that no longer matches any column is left unresolved (empty id); the chip still renders
 * with the name it has, visibly unresolved rather than silently dropped. */
export function resolveColumnBlocks(
  blocks: readonly FormulaBlock[],
  columnsByName: ReadonlyMap<string, string>,
): FormulaBlock[] {
  return blocks.map((block) => {
    if (block.kind === 'column') {
      const id = columnsByName.get(block.columnName.toLowerCase());
      return id ? { ...block, columnId: id } : block;
    }
    if (block.kind === 'function') {
      return { ...block, args: block.args.map((slot) => resolveColumnBlocks(slot, columnsByName)) };
    }
    return block;
  });
}
