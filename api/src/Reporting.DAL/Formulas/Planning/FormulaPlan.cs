using Reporting.DAL.Formulas.Analysis;
using Reporting.DAL.Formulas.Catalogue;
using Reporting.DAL.Formulas.Evaluation;
using Reporting.Database;

namespace Reporting.DAL.Formulas.Planning;

/// <summary>
/// The computed columns of a dataset, checked and put in dependency order so a formula that reads another
/// formula's column always runs after it. A column that can't run — a bad formula, a circular reference, or
/// a dependency that itself can't run — carries its reason instead of a place in the order.
/// </summary>
public sealed class FormulaPlan
{
    private readonly FormulaEvaluator _evaluator;
    private readonly PlannedColumn[] _runnable;

    private FormulaPlan(IReadOnlyList<PlannedColumn> columns, FormulaEvaluator evaluator)
    {
        Columns = columns;
        _evaluator = evaluator;

        // Every row asks for these, so they are picked out once.
        _runnable = columns.Where(c => c.IsValid).ToArray();
    }

    /// <summary>Every computed column: the runnable ones in dependency order, then those that can't run.</summary>
    public IReadOnlyList<PlannedColumn> Columns { get; }

    public IReadOnlyList<PlannedColumn> Runnable
    {
        get
        {
            return _runnable;
        }
    }

    public static FormulaPlan Build(IReadOnlyCollection<DatasetColumn> columns, FormulaFunctionCatalogue catalogue)
    {
        var index = new FormulaColumnIndex(columns);
        var analyses = new Dictionary<DatasetColumn, FormulaAnalysis>(ReferenceEqualityComparer.Instance);
        var dependencies = new Dictionary<DatasetColumn, List<DatasetColumn>>(ReferenceEqualityComparer.Instance);

        foreach (var column in columns)
        {
            if (!column.IsComputed)
            {
                continue;
            }

            var analysis = FormulaAnalyzer.Analyze(column.FormulaExpression!, index, catalogue, column.Type);
            analyses[column] = analysis;

            // Edges only run between computed columns; a plain column is always ready.
            dependencies[column] = analysis.References.Where(r => r.IsComputed).ToList();
        }

        var (ordered, cyclic) = FormulaDependencyOrder.Sort(dependencies);
        var planned = PlanInOrder(ordered, analyses, dependencies);
        planned.AddRange(PlanCyclic(cyclic, analyses, dependencies));

        // Runnable first (already in order), failures after.
        var result = planned.Where(p => p.IsValid).Concat(planned.Where(p => !p.IsValid)).ToList();
        return new FormulaPlan(result, new FormulaEvaluator(catalogue));
    }

    public PlannedColumn? For(DatasetColumn column)
    {
        foreach (var planned in Columns)
        {
            if (ReferenceEquals(planned.Column, column))
            {
                return planned;
            }
        }

        return null;
    }

    /// <summary>Evaluates every runnable computed column for a row, in dependency order. Reads stored columns from the row's cells; nothing is written.</summary>
    public Dictionary<DatasetColumn, FormulaOutcome> Evaluate(DatasetRow row)
    {
        var cells = new Dictionary<int, DatasetCell>(row.Cells.Count);
        foreach (var cell in row.Cells)
        {
            cells.TryAdd(cell.ColumnId, cell);
        }

        var computed = new Dictionary<DatasetColumn, FormulaOutcome>(_runnable.Length, ReferenceEqualityComparer.Instance);

        object? ReadColumn(DatasetColumn column)
        {
            if (column.IsComputed)
            {
                return computed.TryGetValue(column, out var outcome) ? outcome.Value : null;
            }

            return FormulaCellReader.Read(cells.GetValueOrDefault(column.Id), column.Type);
        }

        foreach (var planned in _runnable)
        {
            computed[planned.Column] = EvaluateColumn(planned, ReadColumn);
        }

        return computed;
    }

    private FormulaOutcome EvaluateColumn(PlannedColumn planned, Func<DatasetColumn, object?> readColumn)
    {
        try
        {
            var value = _evaluator.Evaluate(planned.Analysis, readColumn);
            return FormulaOutcomeFit.To(value, planned.Column.Type);
        }
        catch (FormulaEvaluationException ex)
        {
            return new FormulaOutcome(null, ex.Message);
        }
    }

    private static List<PlannedColumn> PlanInOrder(
        List<DatasetColumn> ordered,
        Dictionary<DatasetColumn, FormulaAnalysis> analyses,
        Dictionary<DatasetColumn, List<DatasetColumn>> dependencies)
    {
        var planned = new List<PlannedColumn>(ordered.Count);
        var failed = new HashSet<DatasetColumn>(ReferenceEqualityComparer.Instance);

        foreach (var column in ordered)
        {
            var analysis = analyses[column];
            var error = analysis.IsValid ? null : analysis.ErrorMessage;

            if (error is null)
            {
                var blocker = dependencies[column].FirstOrDefault(failed.Contains);
                if (blocker is not null)
                {
                    error = $"It depends on [{blocker.Name}], which has an error.";
                }
            }

            if (error is not null)
            {
                failed.Add(column);
            }

            planned.Add(new PlannedColumn(column, analysis, error));
        }

        return planned;
    }

    /// <summary>Whatever never became ready is part of, or hangs off, a circular reference.</summary>
    private static IEnumerable<PlannedColumn> PlanCyclic(
        List<DatasetColumn> cyclic,
        Dictionary<DatasetColumn, FormulaAnalysis> analyses,
        Dictionary<DatasetColumn, List<DatasetColumn>> dependencies)
    {
        foreach (var column in cyclic)
        {
            var readsItself = dependencies[column].Any(d => ReferenceEquals(d, column));
            var error = readsItself
                ? $"[{column.Name}] refers to itself."
                : $"[{column.Name}] is part of a circular reference between formula columns.";
            yield return new PlannedColumn(column, analyses[column], error);
        }
    }
}
