using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Converts text to lower case.</summary>
public sealed class LowerFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "LOWER";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return Text(args, 0).ToLowerInvariant();
    }
}
