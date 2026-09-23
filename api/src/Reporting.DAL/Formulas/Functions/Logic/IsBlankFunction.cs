using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>Whether a value is blank.</summary>
public sealed class IsBlankFunction : IFormulaFunctionImplementation
{
    public string Key => "ISBLANK";

    public object? Invoke(IReadOnlyList<object?> args) =>
        args[0] is null;
}
