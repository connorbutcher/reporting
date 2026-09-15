using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary><c>CONTAINS(text, search)</c> — case-insensitive substring test.</summary>
public sealed class ContainsFunction : IFormulaFunction
{
    public string Name => "CONTAINS";
    public int MinArgs => 2;
    public int MaxArgs => 2;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Bool;

    public object? Invoke(IReadOnlyList<object?> args) =>
        FormulaValues.ToText(args[0]).Contains(FormulaValues.ToText(args[1]), StringComparison.OrdinalIgnoreCase);
}
