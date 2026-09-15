namespace Reporting.DAL.Formulas;

/// <summary>
/// The shape a formula subexpression evaluates to, inferred from its literals, the referenced
/// columns' declared types, and each operator's/function's known return shape — without running
/// the formula. Used only to catch an obvious mismatch between a formula and its declared result
/// column type at save time (e.g. a comparison saved as a Double column); runtime evaluation still
/// governs what actually gets stored, so this is a best-effort check, not a full type system —
/// <see cref="Unknown"/> means "can't tell without running it" and is never treated as an error.
/// </summary>
public enum FormulaStaticKind
{
    Unknown,
    Number,
    Bool,
    String,
    Date,
}
