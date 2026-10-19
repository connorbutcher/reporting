namespace Reporting.DAL.Formulas.Functions.Numeric;

/// <summary>How many of the values aren't blank.</summary>
public sealed class CountFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "COUNT";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var count = 0;
        foreach (var value in args)
        {
            if (value is not null)
            {
                count++;
            }
        }

        return (double)count;
    }
}
