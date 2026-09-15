using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

public sealed class ConcatFunction : IFormulaFunction
{
    public string Name => "CONCAT";
    public int MinArgs => 1;
    public int MaxArgs => int.MaxValue;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.String;

    public object? Invoke(IReadOnlyList<object?> args) => string.Concat(args.Select(FormulaValues.ToText));
}
