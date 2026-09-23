using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Joins values with a delimiter between them, skipping blanks.</summary>
public sealed class TextJoinFunction : IFormulaFunctionImplementation
{
    public string Key => "TEXTJOIN";

    public object? Invoke(IReadOnlyList<object?> args) =>
        string.Join(Text(args, 0), args.Skip(1).Where(v => v is not null).Select(FormulaValues.ToText));
}
