namespace Reporting.Abstractions;

/// <summary><see cref="Any"/> accepts, or as a return kind follows, whatever the arguments are.</summary>
public enum FormulaValueKind
{
    Any,
    Number,
    Text,
    Bool,
    Date
}
