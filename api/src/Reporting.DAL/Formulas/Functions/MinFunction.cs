using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

public sealed class MinFunction : IFormulaFunction
{
    public string Name => "MIN";
    public int MinArgs => 1;
    public int MaxArgs => int.MaxValue;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Number;

    public object? Invoke(IReadOnlyList<object?> args) => args.Select(FormulaValues.ToNumber).Min();
}
