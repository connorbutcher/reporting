using System.Text;
using Reporting.DAL.Formulas.Syntax;

namespace Reporting.DAL.Formulas.References;

/// <summary>Text-level operations on stored formulas that need only the token stream: which columns one names, and rewriting a reference when a column is renamed.</summary>
public static class FormulaText
{
    /// <summary>The column names a formula refers to. Empty for text that doesn't tokenize.</summary>
    public static IReadOnlyList<string> ReferencedColumnNames(string expression)
    {
        var tokens = TokenizeOrNull(expression);
        if (tokens is null)
        {
            return [];
        }

        var names = new List<string>();
        foreach (var token in tokens)
        {
            if (token.Kind == FormulaTokenKind.Column)
            {
                names.Add(token.Text);
            }
        }

        return names;
    }

    public static bool References(string expression, string columnName)
    {
        var tokens = TokenizeOrNull(expression);
        if (tokens is null)
        {
            return false;
        }

        foreach (var token in tokens)
        {
            if (IsReferenceTo(token, columnName))
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>The formula with every <c>[oldName]</c> reference now reading <c>[newName]</c>. Text inside string literals is left alone.</summary>
    public static string RenameColumn(string expression, string oldName, string newName)
    {
        var tokens = TokenizeOrNull(expression);
        if (tokens is null)
        {
            return expression;
        }

        var result = new StringBuilder(expression.Length);
        var cursor = 0;
        foreach (var token in tokens)
        {
            if (!IsReferenceTo(token, oldName))
            {
                continue;
            }

            result.Append(expression, cursor, token.Position - cursor).Append('[').Append(newName).Append(']');
            cursor = token.End;
        }

        return result.Append(expression, cursor, expression.Length - cursor).ToString();
    }

    private static bool IsReferenceTo(FormulaToken token, string columnName)
    {
        return token.Kind == FormulaTokenKind.Column && string.Equals(token.Text, columnName, StringComparison.OrdinalIgnoreCase);
    }

    private static List<FormulaToken>? TokenizeOrNull(string expression)
    {
        try
        {
            return FormulaLexer.Tokenize(expression);
        }
        catch (FormulaSyntaxException)
        {
            return null;
        }
    }
}
