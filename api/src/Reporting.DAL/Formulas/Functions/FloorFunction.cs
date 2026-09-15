using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary><c>FLOOR(number)</c> — rounds down to the nearest whole number.</summary>
public sealed class FloorFunction : IFormulaFunction
{
    public string Name => "FLOOR";
    public int MinArgs => 1;
    public int MaxArgs => 1;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Number;

    public object? Invoke(IReadOnlyList<object?> args) => Math.Floor(FormulaValues.ToNumber(args[0]));
}
