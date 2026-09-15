using Reporting.DAL.Formulas;

namespace Reporting.DAL.Formulas.Functions;

/// <summary>
/// One whitelisted formula function: its name, arity, the static kind it returns (for save-time
/// validation), and its runtime implementation. Arguments reaching <see cref="Invoke"/> are never
/// null — a null anywhere in a call's arguments short-circuits the whole call to null before it's
/// invoked, matching how the arithmetic/comparison operators propagate null (see
/// <c>FormulaEvaluator</c>) — so an implementation only ever needs to worry about shape mismatches,
/// not missing data. Deliberately free of anything that reads state or does I/O, so a formula's
/// result is a pure function of the row it's evaluated against.
/// </summary>
public interface IFormulaFunction
{
    string Name { get; }
    int MinArgs { get; }
    int MaxArgs { get; }
    FormulaStaticKind ReturnKind { get; }
    object? Invoke(IReadOnlyList<object?> args);
}
