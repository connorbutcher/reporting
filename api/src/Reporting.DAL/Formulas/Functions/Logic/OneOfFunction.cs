using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>Whether a value equals any of the listed options.</summary>
public sealed class OneOfFunction : IFormulaFunctionImplementation
{
    public string Key => "ONEOF";

    public object? Invoke(IReadOnlyList<object?> args) =>
        args.Skip(1).Any(option => FormulaValues.AreEqual(args[0]!, option!));
}
