using Reporting.Database;
using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Conversion;

/// <summary>Reads text as a number; blank when it isn't one.</summary>
public sealed class ValueFunction : IFormulaFunctionImplementation
{
    public string Key => "VALUE";

    public object? Invoke(IReadOnlyList<object?> args) =>
        CellValues.TryParseNumber(Text(args, 0), out var n) ? n : null;
}
