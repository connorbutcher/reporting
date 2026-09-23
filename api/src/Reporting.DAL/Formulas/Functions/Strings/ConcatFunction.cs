using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Joins values into one piece of text; blanks contribute nothing.</summary>
public sealed class ConcatFunction : IFormulaFunctionImplementation
{
    public string Key => "CONCAT";

    public object? Invoke(IReadOnlyList<object?> args) =>
        string.Concat(args.Select(FormulaValues.ToText));
}
