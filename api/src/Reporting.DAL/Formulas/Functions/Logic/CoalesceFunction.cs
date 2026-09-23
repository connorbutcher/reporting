using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>The first value that isn't blank.</summary>
public sealed class CoalesceFunction : IFormulaFunctionImplementation
{
    public string Key => "COALESCE";

    public object? Invoke(IReadOnlyList<object?> args) =>
        args.FirstOrDefault(v => v is not null);
}
