using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The largest of the numbers, ignoring blanks.</summary>
public sealed class MaxFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "MAX";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var numbers = Numbers(args);
        if (numbers.Count == 0)
        {
            return null;
        }

        return numbers.Max();
    }
}
