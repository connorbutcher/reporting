using Reporting.DAL.Formulas.Evaluation;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>Blank when a value equals another, else the value: turns a placeholder such as 0 or "N/A" into a blank.</summary>
public sealed class NullIfFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "NULLIF";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var value = args[0];
        if (value is null || args[1] is null)
        {
            return value;
        }

        return FormulaValueComparison.AreEqual(value, args[1]!) ? null : value;
    }
}
