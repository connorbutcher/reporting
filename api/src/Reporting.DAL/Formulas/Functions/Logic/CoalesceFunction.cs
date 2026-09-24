using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>The first value that isn't blank.</summary>
public sealed class CoalesceFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "COALESCE";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        foreach (var value in args)
        {
            if (value is not null)
            {
                return value;
            }
        }

        return null;
    }
}
