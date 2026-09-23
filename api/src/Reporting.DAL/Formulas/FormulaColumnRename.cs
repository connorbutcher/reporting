using Reporting.Database;

namespace Reporting.DAL.Formulas;

/// <summary>Keeps formulas in step with the columns they name: renaming a column rewrites the references to it, and removing one is blocked while a formula still reads it.</summary>
public static class FormulaColumnRename
{
    /// <summary>Rewrites <c>[oldName]</c> to <c>[newName]</c> in every computed column's formula.</summary>
    public static void Apply(IEnumerable<DatasetColumn> columns, string oldName, string newName)
    {
        foreach (var column in columns.Where(c => c.IsComputed))
            column.FormulaExpression = FormulaText.RenameColumn(column.FormulaExpression!, oldName, newName);
    }

    /// <summary>The names of the computed columns whose formulas read <paramref name="column"/>.</summary>
    public static List<string> Dependents(IEnumerable<DatasetColumn> columns, DatasetColumn column) =>
        columns
            .Where(c => c.IsComputed && !ReferenceEquals(c, column) && c.Id != column.Id
                && FormulaText.References(c.FormulaExpression!, column.Name))
            .Select(c => c.Name)
            .ToList();
}
