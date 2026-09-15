using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary><c>RIGHT(text, count)</c> — the last <c>count</c> characters; a <c>count</c> longer than
/// the text returns the whole thing rather than throwing.</summary>
public sealed class RightFunction : IFormulaFunction
{
    public string Name => "RIGHT";
    public int MinArgs => 2;
    public int MaxArgs => 2;
    public FormulaStaticKind ReturnKind => FormulaStaticKind.String;

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var text = FormulaValues.ToText(args[0]);
        var count = TextFunctions.NonNegativeCount(Name, args[1]);
        return text[^Math.Min(count, text.Length)..];
    }
}
