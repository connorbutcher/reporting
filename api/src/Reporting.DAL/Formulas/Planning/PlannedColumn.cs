using Reporting.DAL.Formulas.Analysis;
using Reporting.Database;

namespace Reporting.DAL.Formulas.Planning;

/// <summary>One computed column's checked formula. <see cref="Error"/> is why it can't run; null when it can.</summary>
public sealed record PlannedColumn(DatasetColumn Column, FormulaAnalysis Analysis, string? Error)
{
    public bool IsValid
    {
        get
        {
            return Error is null;
        }
    }
}
