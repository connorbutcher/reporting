using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>The second argument when the condition is true, otherwise the third; a blank condition is false.</summary>
public sealed class IfFunction : IFormulaFunctionImplementation
{
    public string Key => "IF";

    public object? Invoke(IReadOnlyList<object?> args) =>
        args[0] is true ? args[1] : args[2];
}
