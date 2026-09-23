using System.Text;

namespace Reporting.DAL.Formulas;

/// <summary>Text-level operations on stored formulas that need only the token stream: which columns one names, and rewriting a reference when a column is renamed.</summary>
public static class FormulaText
{
    /// <summary>The column names a formula refers to. Empty for text that doesn't tokenize.</summary>
    public static IReadOnlyList<string> ReferencedColumnNames(string expression)
    {
        try
        {
            return FormulaLexer.Tokenize(expression)
                .Where(t => t.Kind == FormulaTokenKind.Column)
                .Select(t => t.Text)
                .ToList();
        }
        catch (FormulaSyntaxException)
        {
            return [];
        }
    }

    public static bool References(string expression, string columnName) =>
        ReferencedColumnNames(expression).Any(n => string.Equals(n, columnName, StringComparison.OrdinalIgnoreCase));

    /// <summary>The formula with every <c>[oldName]</c> reference now reading <c>[newName]</c>. Text inside string literals is left alone.</summary>
    public static string RenameColumn(string expression, string oldName, string newName)
    {
        List<FormulaToken> tokens;
        try
        {
            tokens = FormulaLexer.Tokenize(expression);
        }
        catch (FormulaSyntaxException)
        {
            return expression;
        }

        var result = new StringBuilder();
        var cursor = 0;
        foreach (var token in tokens.Where(t =>
                     t.Kind == FormulaTokenKind.Column && string.Equals(t.Text, oldName, StringComparison.OrdinalIgnoreCase)))
        {
            result.Append(expression, cursor, token.Position - cursor).Append('[').Append(newName).Append(']');
            cursor = token.End;
        }

        return result.Append(expression, cursor, expression.Length - cursor).ToString();
    }
}
