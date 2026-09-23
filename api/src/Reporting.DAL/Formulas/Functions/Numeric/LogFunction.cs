using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The logarithm to a base (default 10); blank for a non-positive number or an invalid base.</summary>
public sealed class LogFunction : IFormulaFunctionImplementation
{
    public string Key => "LOG";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var value = Number(args, 0);
        var logBase = args.Count > 1 ? Number(args, 1) : 10;
        if (value <= 0 || logBase <= 0 || logBase == 1) return null;
        return Math.Log(value) / Math.Log(logBase);
    }
}
