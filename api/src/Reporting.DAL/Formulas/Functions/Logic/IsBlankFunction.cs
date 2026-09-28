using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>Whether a value is blank.</summary>
public sealed class IsBlankFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "ISBLANK";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return args[0] is null;
    }
}
