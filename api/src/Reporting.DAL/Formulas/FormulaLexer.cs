using System.Text;

namespace Reporting.DAL.Formulas;

/// <summary>Turns formula source text into a flat token stream for <see cref="FormulaParser"/>.</summary>
public static class FormulaLexer
{
    private const string SingleCharSymbols = "+-*/(),=<>";

    public static List<FormulaToken> Tokenize(string expression)
    {
        var tokens = new List<FormulaToken>();
        var i = 0;

        while (i < expression.Length)
        {
            var c = expression[i];

            if (char.IsWhiteSpace(c))
            {
                i++;
                continue;
            }

            if (c == '[')
            {
                var close = expression.IndexOf(']', i + 1);
                if (close < 0) throw new FormulaParseException("Unterminated column reference — missing ']'.", i);

                var name = expression[(i + 1)..close].Trim();
                if (name.Length == 0) throw new FormulaParseException("Empty column reference '[]'.", i);

                tokens.Add(new FormulaToken(FormulaTokenKind.ColumnRef, name, i));
                i = close + 1;
                continue;
            }

            if (c == '"')
            {
                var start = i;
                var text = new StringBuilder();
                i++;
                while (i < expression.Length && expression[i] != '"')
                {
                    // "" inside a string literal is an escaped quote, not the closing one.
                    if (expression[i] == '"' && i + 1 < expression.Length && expression[i + 1] == '"')
                    {
                        text.Append('"');
                        i += 2;
                        continue;
                    }
                    text.Append(expression[i]);
                    i++;
                }
                if (i >= expression.Length) throw new FormulaParseException("Unterminated string literal.", start);
                i++; // closing quote
                tokens.Add(new FormulaToken(FormulaTokenKind.String, text.ToString(), start));
                continue;
            }

            if (char.IsAsciiDigit(c) || (c == '.' && i + 1 < expression.Length && char.IsAsciiDigit(expression[i + 1])))
            {
                var start = i;
                var sawDot = false;
                while (i < expression.Length && (char.IsAsciiDigit(expression[i]) || (expression[i] == '.' && !sawDot)))
                {
                    if (expression[i] == '.') sawDot = true;
                    i++;
                }
                tokens.Add(new FormulaToken(FormulaTokenKind.Number, expression[start..i], start));
                continue;
            }

            if (char.IsLetter(c) || c == '_')
            {
                var start = i;
                while (i < expression.Length && (char.IsLetterOrDigit(expression[i]) || expression[i] == '_')) i++;
                tokens.Add(new FormulaToken(FormulaTokenKind.Identifier, expression[start..i], start));
                continue;
            }

            if (c is '<' or '>' && i + 1 < expression.Length && expression[i + 1] == '=')
            {
                tokens.Add(new FormulaToken(FormulaTokenKind.Symbol, expression.Substring(i, 2), i));
                i += 2;
                continue;
            }
            if (c == '<' && i + 1 < expression.Length && expression[i + 1] == '>')
            {
                tokens.Add(new FormulaToken(FormulaTokenKind.Symbol, "<>", i));
                i += 2;
                continue;
            }

            if (SingleCharSymbols.IndexOf(c) >= 0)
            {
                tokens.Add(new FormulaToken(FormulaTokenKind.Symbol, c.ToString(), i));
                i++;
                continue;
            }

            throw new FormulaParseException($"Unexpected character '{c}'.", i);
        }

        tokens.Add(new FormulaToken(FormulaTokenKind.End, string.Empty, expression.Length));
        return tokens;
    }
}
