namespace Reporting.Abstractions;

/// <summary>The kind of value a formula expression or function parameter deals in. <see cref="Any"/> accepts (or, as a return kind, follows) whatever the arguments are.</summary>
public enum FormulaValueKind
{
    Any,
    Number,
    Text,
    Bool,
    Date
}
