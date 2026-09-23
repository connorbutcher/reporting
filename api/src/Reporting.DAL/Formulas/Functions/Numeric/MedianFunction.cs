using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The middle of the numbers, ignoring blanks.</summary>
public sealed class MedianFunction : IFormulaFunctionImplementation
{
    public string Key => "MEDIAN";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var numbers = Numbers(args);
        if (numbers.Count == 0) return null;

        numbers.Sort();
        var mid = numbers.Count / 2;
        return numbers.Count % 2 == 1 ? numbers[mid] : (numbers[mid - 1] + numbers[mid]) / 2;
    }
}
