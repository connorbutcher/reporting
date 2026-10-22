using Reporting.DAL.Formulas.Evaluation;
using Reporting.Database;

namespace Reporting.DAL.Formulas.Planning;

/// <summary>What a formula reads for one row: a stored column's cell, or an earlier computed column's outcome.</summary>
internal sealed class FormulaRowReader(Dictionary<int, DatasetCell> cells, Dictionary<DatasetColumn, FormulaOutcome> computed)
{
    public object? Read(DatasetColumn column)
    {
        if (column.IsComputed)
        {
            return computed.TryGetValue(column, out var outcome) ? outcome.Value : null;
        }

        return FormulaCellReader.Read(cells.GetValueOrDefault(column.Id), column.Type);
    }
}
