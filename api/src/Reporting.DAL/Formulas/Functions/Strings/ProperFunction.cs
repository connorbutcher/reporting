using System.Globalization;
using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Capitalises the first letter of every word.</summary>
public sealed class ProperFunction : IFormulaFunctionImplementation
{
    public string Key => "PROPER";

    public object? Invoke(IReadOnlyList<object?> args) =>
        CultureInfo.InvariantCulture.TextInfo.ToTitleCase(Text(args, 0).ToLowerInvariant());
}
