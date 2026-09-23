using System.Globalization;
using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Conversion;

/// <summary>Converts a value to text, optionally with a .NET format string.</summary>
public sealed class TextFunction : IFormulaFunctionImplementation
{
    public string Key => "TEXT";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        if (args.Count < 2) return FormulaValues.ToText(args[0]);

        var format = Text(args, 1);
        try
        {
            return args[0] switch
            {
                double d => d.ToString(format, CultureInfo.InvariantCulture),
                DateTime dt => dt.ToString(format, CultureInfo.InvariantCulture),
                var other => FormulaValues.ToText(other)
            };
        }
        catch (FormatException)
        {
            throw new FormulaEvaluationException($"'{format}' isn't a valid format.");
        }
    }
}
