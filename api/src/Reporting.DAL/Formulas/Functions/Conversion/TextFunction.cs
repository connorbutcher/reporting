using System.Globalization;
using Reporting.DAL.Formulas.Evaluation;
using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Conversion;

/// <summary>Converts a value to text, optionally with a .NET format string.</summary>
public sealed class TextFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "TEXT";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        if (args.Count < 2)
        {
            return FormulaValueText.ToText(args[0]);
        }

        var format = Text(args, 1);
        try
        {
            switch (args[0])
            {
                case double number:
                    return number.ToString(format, CultureInfo.InvariantCulture);
                case DateTime date:
                    return date.ToString(format, CultureInfo.InvariantCulture);
                default:
                    return FormulaValueText.ToText(args[0]);
            }
        }
        catch (FormatException)
        {
            throw new FormulaEvaluationException($"'{format}' isn't a valid format.");
        }
    }
}
