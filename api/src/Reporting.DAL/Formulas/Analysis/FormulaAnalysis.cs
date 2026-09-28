using Reporting.Abstractions;
using Reporting.DAL.Formulas.Ast;
using Reporting.Database;

namespace Reporting.DAL.Formulas.Analysis;

/// <summary>The outcome of checking a formula against a set of columns and the function catalogue.</summary>
public sealed class FormulaAnalysis
{
    private IReadOnlyCollection<DatasetColumn>? _references;

    public FormulaNode? Root { get; init; }

    /// <summary>The kind of value the formula produces; <see cref="FormulaValueKind.Any"/> when it can't be told statically.</summary>
    public FormulaValueKind ResultKind { get; init; } = FormulaValueKind.Any;

    /// <summary>Which column each <c>[reference]</c> in the formula resolved to.</summary>
    public IReadOnlyDictionary<ColumnNode, DatasetColumn> Bindings { get; init; } = new Dictionary<ColumnNode, DatasetColumn>();

    public IReadOnlyList<FormulaErrorDto> Errors { get; init; } = [];

    /// <summary>The columns the formula reads, each once.</summary>
    public IReadOnlyCollection<DatasetColumn> References
    {
        get
        {
            _references ??= Bindings.Values.Distinct().ToList();
            return _references;
        }
    }

    public bool IsValid
    {
        get
        {
            return Root is not null && Errors.Count == 0;
        }
    }

    public string ErrorMessage
    {
        get
        {
            return string.Join(" ", Errors.Select(e => e.Message));
        }
    }
}
