using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

public sealed class TrimFunction : IFormulaFunction
{
    public string Name => "TRIM";
    public int MinArgs => 1;
    public int MaxArgs => 1;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.String;

    public object? Invoke(IReadOnlyList<object?> args) => FormulaValues.ToText(args[0]).Trim();
}
