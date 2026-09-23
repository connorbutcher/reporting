using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The constant π.</summary>
public sealed class PiFunction : IFormulaFunctionImplementation
{
    public string Key => "PI";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Math.PI;
}
