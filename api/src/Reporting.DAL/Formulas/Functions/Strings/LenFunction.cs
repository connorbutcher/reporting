using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>The number of characters in the text.</summary>
public sealed class LenFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "LEN";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return (double)Text(args, 0).Length;
    }
}
