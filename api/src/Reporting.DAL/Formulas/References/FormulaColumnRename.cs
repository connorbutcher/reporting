using Reporting.Database;

namespace Reporting.DAL.Formulas.References;

/// <summary>Keeps formulas in step with the columns they name: renaming a column rewrites the references to it, and removing one is blocked while a formula still reads it.</summary>
public static class FormulaColumnRename
{
    /// <summary>Rewrites <c>[oldName]</c> to <c>[newName]</c> in every computed column's formula.</summary>
    public static void Apply(IEnumerable<DatasetColumn> columns, string oldName, string newName)
    {
        foreach (var column in columns)
        {
            if (column.IsComputed)
            {
                column.FormulaExpression = FormulaText.RenameColumn(column.FormulaExpression!, oldName, newName);
            }
        }
    }

    /// <summary>The names of the computed columns whose formulas read <paramref name="column"/>.</summary>
    public static List<string> Dependents(IEnumerable<DatasetColumn> columns, DatasetColumn column)
    {
        var dependents = new List<string>();
        foreach (var candidate in columns)
        {
            if (IsDependent(candidate, column))
            {
                dependents.Add(candidate.Name);
            }
        }

        return dependents;
    }

    private static bool IsDependent(DatasetColumn candidate, DatasetColumn column)
    {
        return candidate.IsComputed
            && !ReferenceEquals(candidate, column)
            && candidate.Id != column.Id
            && FormulaText.References(candidate.FormulaExpression!, column.Name);
    }
}
