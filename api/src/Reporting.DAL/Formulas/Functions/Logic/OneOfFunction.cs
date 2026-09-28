using Reporting.DAL.Formulas.Evaluation;
using static Reporting.DAL.Formulas.Functions.FormulaArgs;

namespace Reporting.DAL.Formulas.Functions.Logic;

/// <summary>Whether a value equals any of the listed options.</summary>
public sealed class OneOfFunction : IFormulaFunctionImplementation
{
    public string Key { get; } = "ONEOF";

    public object? Invoke(IReadOnlyList<object?> args)
    {
        for (var i = 1; i < args.Count; i++)
        {
            if (FormulaValueComparison.AreEqual(args[0]!, args[i]!))
            {
                return true;
            }
        }

        return false;
    }
}
