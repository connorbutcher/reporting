using System.Text;
using Reporting.DAL.Formulas.Evaluation;
using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Joins values into one piece of text; blanks contribute nothing.</summary>
public sealed class ConcatFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "CONCAT";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var builder = new StringBuilder();
        foreach (var value in args)
        {
            builder.Append(FormulaValueText.ToText(value));
        }

        return builder.ToString();
    }
}
