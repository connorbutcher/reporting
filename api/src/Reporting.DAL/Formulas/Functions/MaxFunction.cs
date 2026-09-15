using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

public sealed class MaxFunction : IFormulaFunction
{
    public string Name => "MAX";
    public int MinArgs => 1;
    public int MaxArgs => int.MaxValue;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Number;

    public object? Invoke(IReadOnlyList<object?> args) => args.Select(FormulaValues.ToNumber).Max();
}
