using System.Text.RegularExpressions;
using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Removes leading and trailing spaces and collapses repeated inner spaces.</summary>
public sealed class TrimFunction : IFormulaFunctionImplementation
{
    public string Key => "TRIM";

    public object? Invoke(IReadOnlyList<object?> args) =>
        Regex.Replace(Text(args, 0), @"\s+", " ").Trim();
}
