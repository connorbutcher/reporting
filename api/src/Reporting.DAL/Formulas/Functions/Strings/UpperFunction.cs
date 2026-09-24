using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Converts text to upper case.</summary>
public sealed class UpperFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "UPPER";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return Text(args, 0).ToUpperInvariant();
    }
}
