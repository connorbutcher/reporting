using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>Three-valued AND: false as soon as any condition is false, else blank if any is blank, else true.</summary>
public sealed class AndFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "AND";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        var anyBlank = false;
        foreach (var value in args)
        {
            if (value is false)
            {
                return false;
            }

            anyBlank |= value is null;
        }

        return anyBlank ? null : true;
    }
}
