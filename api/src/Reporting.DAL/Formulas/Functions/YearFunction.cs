using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

public sealed class YearFunction : IFormulaFunction
{
    public string Name => "YEAR";
    public int MinArgs => 1;
    public int MaxArgs => 1;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Number;

    public object? Invoke(IReadOnlyList<object?> args) => (double)FormulaValues.ToDate(args[0]).Year;
}
