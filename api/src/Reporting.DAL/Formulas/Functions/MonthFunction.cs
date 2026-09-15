using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

public sealed class MonthFunction : IFormulaFunction
{
    public string Name => "MONTH";
    public int MinArgs => 1;
    public int MaxArgs => 1;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Number;

    public object? Invoke(IReadOnlyList<object?> args) => (double)FormulaValues.ToDate(args[0]).Month;
}
