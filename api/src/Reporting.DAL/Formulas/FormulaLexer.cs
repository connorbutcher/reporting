using System.Globalization;
using System.Text;

namespace Reporting.DAL.Formulas;

public enum FormulaTokenKind
{
    Number,
    Text,
    Column,
    Identifier,
    Operator,
    LeftParen,
    RightParen,
    Comma,
    End
}

/// <summary>A token with its span in the source. <see cref="Text"/> is the meaningful text: a column's name, a string literal's unescaped content, an identifier or operator as written.</summary>
public sealed record FormulaToken(FormulaTokenKind Kind, string Text, int Position, int Length, double Number = 0)
{
    public int End => Position + Length;
}

/// <summary>Splits formula text into tokens. Column references are <c>[bracketed]</c>, string literals are "double quoted" (a doubled quote is a literal quote).</summary>
public static class FormulaLexer
{
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
            else if (char.IsDigit(c) || (c == '.' && i + 1 < source.Length && char.IsDigit(source[i + 1])))
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
                var start = i;
                while (i < source.Length && (char.IsLetterOrDigit(source[i]) || source[i] == '_')) i++;
                tokens.Add(new FormulaToken(FormulaTokenKind.Identifier, source[start..i], start, i - start));
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

    private static FormulaToken ReadNumber(string source, ref int i)
    {
        var start = i;
        while (i < source.Length && char.IsDigit(source[i])) i++;
        if (i < source.Length && source[i] == '.')
        {
            i++;
            while (i < source.Length && char.IsDigit(source[i])) i++;
        }

        // An exponent only counts when digits follow, so "2e" is a number then a stray identifier.
        if (i < source.Length && (source[i] == 'e' || source[i] == 'E'))
        {
            var j = i + 1;
            if (j < source.Length && (source[j] == '+' || source[j] == '-')) j++;
            if (j < source.Length && char.IsDigit(source[j]))
            {
                while (j < source.Length && char.IsDigit(source[j])) j++;
                i = j;
            }
        }

        var text = source[start..i];
        if (!double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var value) || double.IsInfinity(value))
            throw new FormulaSyntaxException($"'{text}' isn't a valid number.", start, i - start);

        return new FormulaToken(FormulaTokenKind.Number, text, start, i - start, value);
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
        if (close < 0) throw new FormulaSyntaxException("This column reference is missing its closing ']'.", start, source.Length - start);

        var name = source[i..close].Trim();
        i = close + 1;
        if (name.Length == 0) throw new FormulaSyntaxException("A column reference needs a column name.", start, i - start);

        return new FormulaToken(FormulaTokenKind.Column, name, start, i - start);
    }

    private static FormulaToken ReadOperator(string source, ref int i)
    {
        var start = i;
        var two = i + 1 < source.Length ? source.Substring(i, 2) : string.Empty;

        switch (two)
        {
            case "<>" or "<=" or ">=":
                i += 2;
                return new FormulaToken(FormulaTokenKind.Operator, two, start, 2);
            case "!=":
                i += 2;
                return new FormulaToken(FormulaTokenKind.Operator, "<>", start, 2);
            case "==":
                i += 2;
                return new FormulaToken(FormulaTokenKind.Operator, "=", start, 2);
        }

        var c = source[i];
        if ("+-*/%^&=<>".Contains(c))
        {
            i++;
            return new FormulaToken(FormulaTokenKind.Operator, c.ToString(), start, 1);
        }

        throw new FormulaSyntaxException($"Unexpected character '{c}'.", start, 1);
    }
}
