using System.Globalization;
using System.Text;

namespace Reporting.DAL.Formulas.Syntax;

/// <summary>Splits formula text into tokens. Column references are <c>[bracketed]</c>, string literals are "double quoted" (a doubled quote is a literal quote).</summary>
public static class FormulaLexer
{
    private const string SingleCharacterOperators = "+-*/%^&=<>";

    public static List<FormulaToken> Tokenize(string source)
    {
        var tokens = new List<FormulaToken>();
        var i = 0;

        while (i < source.Length)
        {
            var c = source[i];

            if (char.IsWhiteSpace(c))
            {
                i++;
            }
            else if (StartsNumber(source, i))
            {
                tokens.Add(ReadNumber(source, ref i));
            }
            else if (c == '"')
            {
                tokens.Add(ReadString(source, ref i));
            }
            else if (c == '[')
            {
                tokens.Add(ReadColumn(source, ref i));
            }
            else if (char.IsLetter(c) || c == '_')
            {
                tokens.Add(ReadIdentifier(source, ref i));
            }
            else if (c == '(')
            {
                tokens.Add(new FormulaToken(FormulaTokenKind.LeftParen, "(", i++, 1));
            }
            else if (c == ')')
            {
                tokens.Add(new FormulaToken(FormulaTokenKind.RightParen, ")", i++, 1));
            }
            else if (c == ',')
            {
                tokens.Add(new FormulaToken(FormulaTokenKind.Comma, ",", i++, 1));
            }
            else
            {
                tokens.Add(ReadOperator(source, ref i));
            }
        }

        tokens.Add(new FormulaToken(FormulaTokenKind.End, string.Empty, source.Length, 0));
        return tokens;
    }

    private static bool StartsNumber(string source, int i)
    {
        var c = source[i];
        if (char.IsDigit(c))
        {
            return true;
        }

        return c == '.' && i + 1 < source.Length && char.IsDigit(source[i + 1]);
    }

    private static FormulaToken ReadIdentifier(string source, ref int i)
    {
        var start = i;
        while (i < source.Length && (char.IsLetterOrDigit(source[i]) || source[i] == '_'))
        {
            i++;
        }

        return new FormulaToken(FormulaTokenKind.Identifier, source.Substring(start, i - start), start, i - start);
    }

    private static FormulaToken ReadNumber(string source, ref int i)
    {
        var start = i;
        SkipDigits(source, ref i);
        if (i < source.Length && source[i] == '.')
        {
            i++;
            SkipDigits(source, ref i);
        }

        SkipExponent(source, ref i);

        var text = source.Substring(start, i - start);
        if (!double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var value) || double.IsInfinity(value))
        {
            throw new FormulaSyntaxException($"'{text}' isn't a valid number.", start, i - start);
        }

        return new FormulaToken(FormulaTokenKind.Number, text, start, i - start, value);
    }

    private static void SkipDigits(string source, ref int i)
    {
        while (i < source.Length && char.IsDigit(source[i]))
        {
            i++;
        }
    }

    /// <summary>An exponent only counts when digits follow, so "2e" is a number then a stray identifier.</summary>
    private static void SkipExponent(string source, ref int i)
    {
        if (i >= source.Length || (source[i] != 'e' && source[i] != 'E'))
        {
            return;
        }

        var j = i + 1;
        if (j < source.Length && (source[j] == '+' || source[j] == '-'))
        {
            j++;
        }

        if (j < source.Length && char.IsDigit(source[j]))
        {
            SkipDigits(source, ref j);
            i = j;
        }
    }

    private static FormulaToken ReadString(string source, ref int i)
    {
        var start = i++;
        var text = new StringBuilder();
        while (i < source.Length)
        {
            if (source[i] == '"')
            {
                if (i + 1 < source.Length && source[i + 1] == '"')
                {
                    text.Append('"');
                    i += 2;
                    continue;
                }

                i++;
                return new FormulaToken(FormulaTokenKind.Text, text.ToString(), start, i - start);
            }

            text.Append(source[i++]);
        }

        throw new FormulaSyntaxException("This text is missing its closing quote.", start, source.Length - start);
    }

    private static FormulaToken ReadColumn(string source, ref int i)
    {
        var start = i++;
        var close = source.IndexOf(']', i);
        if (close < 0)
        {
            throw new FormulaSyntaxException("This column reference is missing its closing ']'.", start, source.Length - start);
        }

        var name = source.Substring(i, close - i).Trim();
        i = close + 1;
        if (name.Length == 0)
        {
            throw new FormulaSyntaxException("A column reference needs a column name.", start, i - start);
        }

        return new FormulaToken(FormulaTokenKind.Column, name, start, i - start);
    }

    private static FormulaToken ReadOperator(string source, ref int i)
    {
        var start = i;
        var c = source[i];
        var next = i + 1 < source.Length ? source[i + 1] : '\0';

        if ((c == '<' && (next == '>' || next == '=')) || (c == '>' && next == '='))
        {
            i += 2;
            return new FormulaToken(FormulaTokenKind.Operator, source.Substring(start, 2), start, 2);
        }

        if (c == '!' && next == '=')
        {
            i += 2;
            return new FormulaToken(FormulaTokenKind.Operator, "<>", start, 2);
        }

        if (c == '=' && next == '=')
        {
            i += 2;
            return new FormulaToken(FormulaTokenKind.Operator, "=", start, 2);
        }

        if (SingleCharacterOperators.Contains(c))
        {
            i++;
            return new FormulaToken(FormulaTokenKind.Operator, c.ToString(), start, 1);
        }

        throw new FormulaSyntaxException($"Unexpected character '{c}'.", start, 1);
    }
}
