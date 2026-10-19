using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>True when an odd number of the conditions are true.</summary>
public sealed class XorFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "XOR";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var result = false;
        for (var i = 0; i < args.Count; i++)
        {
            result ^= Bool(args, i);
        }

        return result;
    }
}
