using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Formulas;

/// <summary>One computed column's checked formula. <see cref="Error"/> is why it can't run; null when it can.</summary>
public sealed record PlannedColumn(DatasetColumn Column, FormulaAnalysis Analysis, string? Error)
{
    public bool IsValid => Error is null;
}

/// <summary>What a computed column came to for one row: a value (null when blank) or the reason it failed.</summary>
public readonly record struct FormulaOutcome(object? Value, string? Error);

/// <summary>
/// The computed columns of a dataset, checked and put in dependency order so a formula that reads another
/// formula's column always runs after it. A column that can't run — a bad formula, a circular reference, or
/// a dependency that itself can't run — carries its reason instead of a place in the order.
/// </summary>
public sealed class FormulaPlan
{
    private readonly FormulaEvaluator _evaluator;

    private FormulaPlan(IReadOnlyList<PlannedColumn> columns, FormulaEvaluator evaluator)
    {
        Columns = columns;
        _evaluator = evaluator;
    }

    /// <summary>Every computed column: the runnable ones in dependency order, then those that can't run.</summary>
    public IReadOnlyList<PlannedColumn> Columns { get; }

    public IEnumerable<PlannedColumn> Runnable => Columns.Where(c => c.IsValid);

    public PlannedColumn? For(DatasetColumn column) => Columns.FirstOrDefault(c => ReferenceEquals(c.Column, column));

    public static FormulaPlan Build(IReadOnlyCollection<DatasetColumn> columns, FormulaFunctionCatalogue catalogue)
    {
        var analyses = new Dictionary<DatasetColumn, FormulaAnalysis>(ReferenceEqualityComparer.Instance);
        foreach (var column in columns.Where(c => c.IsComputed))
            analyses[column] = FormulaAnalyzer.Analyze(column.FormulaExpression!, columns, catalogue, column.Type);

        // Edges only run between computed columns; a plain column is always ready.
        var dependencies = new Dictionary<DatasetColumn, List<DatasetColumn>>(ReferenceEqualityComparer.Instance);
        foreach (var (column, analysis) in analyses)
            dependencies[column] = analysis.References.Where(r => r.IsComputed).ToList();

        var ordered = new List<DatasetColumn>();
        var placed = new HashSet<DatasetColumn>(ReferenceEqualityComparer.Instance);
        bool progressed;
        do
        {
            progressed = false;
            foreach (var column in analyses.Keys.Where(c => !placed.Contains(c)))
            {
                if (dependencies[column].All(placed.Contains))
                {
                    ordered.Add(column);
                    placed.Add(column);
                    progressed = true;
                }
            }
        } while (progressed);

        var planned = new List<PlannedColumn>();
        var failed = new Dictionary<DatasetColumn, string>(ReferenceEqualityComparer.Instance);

        foreach (var column in ordered)
        {
            var analysis = analyses[column];
            var blocker = dependencies[column].FirstOrDefault(failed.ContainsKey);
            var error = analysis.IsValid ? null : analysis.ErrorMessage;
            if (error is null && blocker is not null) error = $"It depends on [{blocker.Name}], which has an error.";

            if (error is not null) failed[column] = error;
            planned.Add(new PlannedColumn(column, analysis, error));
        }

        // Whatever never became ready is part of, or hangs off, a circular reference.
        foreach (var column in analyses.Keys.Where(c => !placed.Contains(c)))
        {
            var loop = dependencies[column].Any(d => ReferenceEquals(d, column))
                ? $"[{column.Name}] refers to itself."
                : $"[{column.Name}] is part of a circular reference between formula columns.";
            planned.Add(new PlannedColumn(column, analyses[column], loop));
        }

        // Runnable first (already in order), failures after.
        var result = planned.Where(p => p.IsValid).Concat(planned.Where(p => !p.IsValid)).ToList();
        return new FormulaPlan(result, new FormulaEvaluator(catalogue));
    }

    /// <summary>Evaluates every runnable computed column for a row, in dependency order. Reads stored columns from the row's cells; nothing is written.</summary>
    public Dictionary<DatasetColumn, FormulaOutcome> Evaluate(DatasetRow row)
    {
        var cells = new Dictionary<int, DatasetCell>();
        foreach (var cell in row.Cells) cells.TryAdd(cell.ColumnId, cell);

        var computed = new Dictionary<DatasetColumn, FormulaOutcome>(ReferenceEqualityComparer.Instance);

        object? Read(DatasetColumn column) =>
            column.IsComputed
                ? computed.TryGetValue(column, out var outcome) ? outcome.Value : null
                : CellValue(cells.GetValueOrDefault(column.Id), column.Type);

        foreach (var planned in Runnable)
        {
            try
            {
                var value = _evaluator.Evaluate(planned.Analysis, Read);
                computed[planned.Column] = Fit(value, planned.Column.Type);
            }
            catch (FormulaEvaluationException ex)
            {
                computed[planned.Column] = new FormulaOutcome(null, ex.Message);
            }
        }

        return computed;
    }

    /// <summary>A stored cell's value as the type its column declares; blank text and unparsable values are null.</summary>
    private static object? CellValue(DatasetCell? cell, DatasetColumnType type) => cell is null
        ? null
        : type switch
        {
            DatasetColumnType.Int or DatasetColumnType.Double => cell.NumberValue,
            DatasetColumnType.Bool => cell.BoolValue,
            DatasetColumnType.DateTime => cell.DateValue,
            _ => string.IsNullOrWhiteSpace(cell.StringValue) ? null : cell.StringValue
        };

    /// <summary>Shapes a computed value to its column's type, so dependents see what the stored cell would hold.</summary>
    private static FormulaOutcome Fit(object? value, DatasetColumnType type)
    {
        if (value is null) return new FormulaOutcome(null, null);

        return type switch
        {
            DatasetColumnType.String => new FormulaOutcome(FormulaValues.ToText(value), null),
            DatasetColumnType.Int when value is double d => new FormulaOutcome(Math.Round(d, MidpointRounding.AwayFromZero), null),
            _ when FormulaValues.Matches(value, FormulaValues.KindOf(type)) => new FormulaOutcome(value, null),
            _ => new FormulaOutcome(null, $"The formula produced {FormulaValues.Describe(value)}, which doesn't fit a {type} column.")
        };
    }
}
