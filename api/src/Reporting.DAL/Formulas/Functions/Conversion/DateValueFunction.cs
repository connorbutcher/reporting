using Reporting.Database;
using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Conversion;

/// <summary>Reads text as a date; blank when it is not one.</summary>
public sealed class DateValueFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "DATEVALUE";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        if (CellValues.TryParseDate(Text(args, 0), out var date))
        {
            return date;
        }

        return null;
    }
}
