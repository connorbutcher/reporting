using System.Text;
using Reporting.DAL.Formulas.Evaluation;
using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Joins values with a delimiter between them, skipping blanks.</summary>
public sealed class TextJoinFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "TEXTJOIN";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var delimiter = Text(args, 0);
        var builder = new StringBuilder();
        var first = true;
        for (var i = 1; i < args.Count; i++)
        {
            if (args[i] is null)
            {
                continue;
            }

            if (!first)
            {
                builder.Append(delimiter);
            }

            first = false;

            builder.Append(FormulaValueText.ToText(args[i]));
        }

        return builder.ToString();
    }
}
