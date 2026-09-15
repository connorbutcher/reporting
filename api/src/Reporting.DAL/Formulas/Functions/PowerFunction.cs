using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

public sealed class PowerFunction : IFormulaFunction
{
    public string Name => "POWER";
    public int MinArgs => 2;
    public int MaxArgs => 2;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Number;

    public object? Invoke(IReadOnlyList<object?> args) =>
        Math.Pow(FormulaValues.ToNumber(args[0]), FormulaValues.ToNumber(args[1]));
}
