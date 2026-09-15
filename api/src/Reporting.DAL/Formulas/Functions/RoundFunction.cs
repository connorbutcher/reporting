using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary><c>ROUND(number, digits?)</c> — away-from-zero midpoint rounding, matching how a person
/// reading the result would expect .5 to round (not the .NET default banker's rounding).</summary>
public sealed class RoundFunction : IFormulaFunction
{
    public string Name => "ROUND";
    public int MinArgs => 1;
    public int MaxArgs => 2;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.Number;

    public object? Invoke(IReadOnlyList<object?> args) => Math.Round(
        FormulaValues.ToNumber(args[0]),
        args.Count > 1 ? Digits(args[1]) : 0,
        MidpointRounding.AwayFromZero);

    private static int Digits(object? value)
    {
        var digits = FormulaValues.ToNumber(value);
        if (digits < 0 || digits > 15 || digits != Math.Floor(digits))
            throw new FormulaEvaluationException("ROUND's digits argument must be a whole number from 0 to 15.");
        return (int)digits;
    }
}
