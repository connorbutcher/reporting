using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary><c>LEN(text)</c> — character count.</summary>
public sealed class LenFunction : IFormulaFunction
{
    public string Name => "LEN";
    public int MinArgs => 1;
    public int MaxArgs => 1;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Number;

    public object? Invoke(IReadOnlyList<object?> args) => (double)FormulaValues.ToText(args[0]).Length;
}
