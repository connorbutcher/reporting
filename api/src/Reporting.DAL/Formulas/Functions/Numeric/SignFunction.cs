using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>-1, 0 or 1 according to the number's sign.</summary>
public sealed class SignFunction : IFormulaFunctionImplementation
{
    public string Key => "SIGN";

    public object? Invoke(IReadOnlyList<object?> args) =>
        (double)Math.Sign(Number(args, 0));
}
