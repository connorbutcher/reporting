namespace Reporting.Abstractions;

public enum FilterOperator
{
    // Valid for every type.
    Equals,
    NotEquals,
    IsEmpty,
    IsNotEmpty,

    // String.
    Contains,
    NotContains,
    StartsWith,
    EndsWith,
    In,

    // Numeric and date (dates reuse these with their own labels).
    GreaterThan,
    GreaterThanOrEqual,
    LessThan,
    LessThanOrEqual,
    Between,

    // Bool.
    IsTrue,
    IsFalse,

    // Date, relative to today.
    InLastDays,
    InNextDays,

    // Numeric, against the column's tolerance banding: no operand, bounds resolved at query time.
    InTolerance,
    NeedsConcession,
    OutOfTolerance
}
