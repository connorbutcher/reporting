using Reporting.Database;
using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Conversion;

/// <summary>Reads text as a number; blank when it is not one.</summary>
public sealed class ValueFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "VALUE";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        if (CellValues.TryParseNumber(Text(args, 0), out var number))
        {
            return number;
        }

        return null;
    }
}
