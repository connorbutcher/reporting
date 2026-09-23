using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>Three-valued AND: false as soon as any condition is false, else blank if any is blank, else true.</summary>
public sealed class AndFunction : IFormulaFunctionImplementation
{
    public string Key => "AND";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        if (args.Any(v => v is false)) return false;
        return args.Any(v => v is null) ? null : true;
    }
}
