using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>The numbers multiplied together, ignoring blanks.</summary>
public sealed class ProductFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "PRODUCT";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var numbers = Numbers(args);
        if (numbers.Count == 0)
        {
            return null;
        }

        var product = 1.0;
        foreach (var number in numbers)
        {
            product *= number;
        }

        return product;
    }
}
