using System.Globalization;
using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Capitalises the first letter of every word.</summary>
public sealed class ProperFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "PROPER";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(Text(args, 0).ToLowerInvariant());
    }
}
