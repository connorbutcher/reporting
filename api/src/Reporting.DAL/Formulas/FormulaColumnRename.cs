using System.Text.RegularExpressions;
using Reporting.Database;

namespace Reporting.DAL.Formulas;

/// <summary>Keeps a dataset's formulas consistent with a column's identity — who depends on a
/// column (for a delete to block on), and rewriting formula text when a column is renamed.</summary>
public static class FormulaColumnRename
{
    /// <summary>The other computed columns in the dataset whose formula references
    /// <paramref name="target"/> by name — what a delete needs to block on.</summary>
    public static List<string> DependentColumnNames(DatasetColumn target, IReadOnlyList<DatasetColumn> allColumns)
    {
        var dependents = new List<string>();
        foreach (var column in allColumns.Where(c =>
                     c.IsComputed && c.RefId != target.RefId && !string.IsNullOrWhiteSpace(c.FormulaExpression)))
        {
            try
            {
                var ast = FormulaParser.Parse(column.FormulaExpression!);
                if (FormulaParser.ReferencedColumnNames(ast).Contains(target.Name))
                    dependents.Add(column.Name);
            }
            catch (FormulaParseException)
            {
                // Already broken independently of target.
            }
        }
        return dependents;
    }

    /// <summary>
    /// Rewrites every `[oldName]` reference in the dataset's formulas to `[newName]` — so renaming a
    /// column never silently breaks a formula that pointed at its old name. Returns the columns whose
    /// expression text changed, for the caller to re-validate and recompute.
    /// </summary>
    public static List<DatasetColumn> RenameReferences(IReadOnlyList<DatasetColumn> allColumns, string oldName, string newName)
    {
        if (string.Equals(oldName, newName, StringComparison.OrdinalIgnoreCase)) return [];

        var pattern = new Regex(@"\[\s*" + Regex.Escape(oldName) + @"\s*\]", RegexOptions.IgnoreCase);
        var changed = new List<DatasetColumn>();
        foreach (var column in allColumns.Where(c => c.IsComputed && !string.IsNullOrWhiteSpace(c.FormulaExpression)))
        {
            var rewritten = pattern.Replace(column.FormulaExpression!, $"[{newName}]");
            if (rewritten != column.FormulaExpression)
            {
                column.FormulaExpression = rewritten;
                changed.Add(column);
            }
        }
        return changed;
    }
}
