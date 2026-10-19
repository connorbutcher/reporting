using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Pads the text on the right up to a length.</summary>
public sealed class PadRightFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "PADRIGHT";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var text = Text(args, 0);
        var length = WholeNumber(args, 1, 0);
        var pad = args.Count > 2 ? Text(args, 2) : " ";
        if (length < 0 || length > TextLimits.MaxLength)
        {
            return null;
        }

        if (pad.Length == 0)
        {
            return text;
        }

        return text.PadRight(length, pad[0]);
    }
}
