using Reporting.Abstractions;
using Reporting.DAL.Formulas.Analysis;
using Reporting.DAL.Formulas.Evaluation;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Formulas;

/// <summary>Everything that has to be true before a formula column can be saved: a usable name, a formula that checks, a settled type, and a place in the dependency order.</summary>
public sealed class FormulaColumnValidator(FormulaCalculationService calculator)
{
    /// <summary>A trimmed name that no other column of the dataset already uses (formulas reference columns by name).</summary>
    public static string ValidName(Dataset dataset, string? name, DatasetColumn? except)
    {
        var trimmed = name?.Trim() ?? string.Empty;
        if (trimmed.Length == 0)
        {
            throw new DataValidationException("A column needs a name.");
        }

        if (trimmed.Contains('[') || trimmed.Contains(']'))
        {
            throw new DataValidationException("A formula column's name can't contain '[' or ']', so formulas could not refer to it.");
        }

        if (dataset.Columns.Any(c => !ReferenceEquals(c, except) && string.Equals(c.Name, trimmed, StringComparison.OrdinalIgnoreCase)))
        {
            throw new DataValidationException($"There's already a column named [{trimmed}].");
        }

        return trimmed;
    }

    /// <summary>Validates the formula against the dataset and settles the column type: the one asked for, else the one the formula produces.</summary>
    public async Task<(string Expression, DatasetColumnType Type)> CheckAsync(Dataset dataset, SaveFormulaColumnDto dto)
    {
        var expression = dto.Expression?.Trim() ?? string.Empty;
        var catalogue = await calculator.GetCatalogueAsync();

        // A formula that reads its own column passes here and is rejected by EnsureRunnableAsync as circular.
        var analysis = FormulaAnalyzer.Analyze(expression, dataset.Columns, catalogue, dto.Type);
        if (!analysis.IsValid)
        {
            throw new DataValidationException(analysis.ErrorMessage);
        }

        var type = dto.Type ?? FormulaValueKinds.NaturalColumnType(analysis.ResultKind);
        if (type is null)
        {
            throw new DataValidationException("The type of this formula's result can't be told from the formula; choose the column's type.");
        }

        return (expression, type.Value);
    }

    /// <summary>Fails when the formula on <paramref name="column"/> can't run in the dataset as it now stands — a circular reference, or a dependency on a formula column that is itself broken.</summary>
    public async Task EnsureRunnableAsync(Dataset dataset, DatasetColumn column)
    {
        var plan = await calculator.PlanAsync(dataset.Columns);
        var planned = plan.For(column);
        if (planned is { IsValid: false })
        {
            throw new DataValidationException(planned.Error!);
        }
    }
}
