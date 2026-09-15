using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary><c>CEILING(number)</c> — rounds up to the nearest whole number.</summary>
public sealed class CeilingFunction : IFormulaFunction
{
    public string Name => "CEILING";
    public int MinArgs => 1;
    public int MaxArgs => 1;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Number;

    public object? Invoke(IReadOnlyList<object?> args) => Math.Ceiling(FormulaValues.ToNumber(args[0]));
}
