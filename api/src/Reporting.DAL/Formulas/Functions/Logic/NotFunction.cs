using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>Reverses a condition; a blank stays blank.</summary>
public sealed class NotFunction : IFormulaFunctionImplementation
{
    public string Key => "NOT";

    public object? Invoke(IReadOnlyList<object?> args) =>
        args[0] is bool b ? !b : null;
}
