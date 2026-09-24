using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>Three-valued OR: true as soon as any condition is true, else blank if any is blank, else false.</summary>
public sealed class OrFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "OR";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var anyBlank = false;
        foreach (var value in args)
        {
            if (value is true)
            {
                return true;
            }

            anyBlank |= value is null;
        }

        return anyBlank ? null : false;
    }
}
