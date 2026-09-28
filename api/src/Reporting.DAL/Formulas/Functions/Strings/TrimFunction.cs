using System.Text.RegularExpressions;
using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Removes leading and trailing spaces and collapses repeated inner spaces.</summary>
public sealed class TrimFunction : IFormulaFunctionImplementation
{
    private static readonly Regex RunsOfWhitespace = new(@"\s+", RegexOptions.Compiled);

    public string Key { get; } = "TRIM";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return RunsOfWhitespace.Replace(Text(args, 0), " ").Trim();
    }
}
