using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary><c>SQRT(number)</c> — square root; negative inputs throw rather than returning NaN, so a
/// bad row surfaces as a null cell instead of a silently poisoned value.</summary>
public sealed class SqrtFunction : IFormulaFunction
{
    public string Name => "SQRT";
    public int MinArgs => 1;
    public int MaxArgs => 1;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Number;

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var value = FormulaValues.ToNumber(args[0]);
        if (value < 0) throw new FormulaEvaluationException("SQRT's argument can't be negative.");
        return Math.Sqrt(value);
    }
}
