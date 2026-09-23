using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>Three-valued OR: true as soon as any condition is true, else blank if any is blank, else false.</summary>
public sealed class OrFunction : IFormulaFunctionImplementation
{
    public string Key => "OR";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        if (args.Any(v => v is true)) return true;
        return args.Any(v => v is null) ? null : false;
    }
}
