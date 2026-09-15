using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary><c>MOD(number, divisor)</c> — remainder of dividing <c>number</c> by <c>divisor</c>,
/// using .NET's <c>%</c> (sign follows the dividend, matching most spreadsheet tools' MOD for
/// positive divisors).</summary>
public sealed class ModFunction : IFormulaFunction
{
    public string Name => "MOD";
    public int MinArgs => 2;
    public int MaxArgs => 2;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Number;

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var divisor = FormulaValues.ToNumber(args[1]);
        if (divisor == 0) throw new FormulaEvaluationException("MOD's divisor can't be zero.");
        return FormulaValues.ToNumber(args[0]) % divisor;
    }
}
