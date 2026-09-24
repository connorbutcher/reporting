using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The middle of the numbers, ignoring blanks.</summary>
public sealed class MedianFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "MEDIAN";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var numbers = Numbers(args);
        if (numbers.Count == 0)
        {
            return null;
        }

        numbers.Sort();
        var middle = numbers.Count / 2;
        if (numbers.Count % 2 == 1)
        {
            return numbers[middle];
        }

        return (numbers[middle - 1] + numbers[middle]) / 2;
    }
}
