using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary><c>REPLACE(text, find, replaceWith)</c> — replaces every occurrence of <c>find</c>,
/// ordinal (case-sensitive) match.</summary>
public sealed class ReplaceFunction : IFormulaFunction
{
    public string Name => "REPLACE";
    public int MinArgs => 3;
    public int MaxArgs => 3;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.String;

    public object? Invoke(IReadOnlyList<object?> args) =>
        FormulaValues.ToText(args[0]).Replace(FormulaValues.ToText(args[1]), FormulaValues.ToText(args[2]));
}
