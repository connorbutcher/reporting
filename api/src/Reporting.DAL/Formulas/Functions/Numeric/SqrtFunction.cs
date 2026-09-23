using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The square root; blank for a negative number.</summary>
public sealed class SqrtFunction : IFormulaFunctionImplementation
{
    public string Key => "SQRT";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Number(args, 0) < 0 ? null : Math.Sqrt(Number(args, 0));
}
