using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

public enum FilterJoin
{
    And,
    Or
}

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

    // Numeric and date. Dates reuse these with their own labels ("is after", …)
    // rather than duplicating the enum.
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

    // Numeric, against the column's configured tolerance banding. These take no
    // operand — the bounds come from the banding, resolved server-side at query time.
    InTolerance,
    NeedsConcession,
    OutOfTolerance
}

/// <summary>What the panel should render for an operator's operands.</summary>
public enum FilterOperandKind
{
    None,
    Text,
    Number,
    Date,
    /// <summary>A comma-separated list of values, for <see cref="FilterOperator.In"/>.</summary>
    List
}

/// <summary>
/// A filter is a tree so nesting is expressible from day one, even while the UI
/// only offers a single level of grouping.
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "kind")]
[JsonDerivedType(typeof(FilterGroupDto), typeDiscriminator: "group")]
[JsonDerivedType(typeof(FilterConditionDto), typeDiscriminator: "condition")]
public abstract class FilterNodeDto
{
}

public class FilterGroupDto : FilterNodeDto
{
    public FilterJoin Join { get; set; } = FilterJoin.And;
    public List<FilterNodeDto> Children { get; set; } = new();
}

public class FilterConditionDto : FilterNodeDto
{
    public Guid ColumnId { get; set; }
    public FilterOperator Operator { get; set; }

    /// <summary>Raw strings parsed against the column's type; 0, 1 or 2 depending on the operator.</summary>
    public List<string> Values { get; set; } = new();

    /// <summary>
    /// Whether this condition narrows the data. Defaults to true, so a condition stored
    /// before toggling existed (its JSON omits the field) still applies. A disabled
    /// condition is retained but skipped when the filter is translated.
    /// </summary>
    public bool Enabled { get; set; } = true;
}

/// <summary>
/// A report-level filter: applies to every data-table widget bound to
/// <see cref="DatasetId"/>, combined with that widget's own filter using AND.
/// </summary>
public class ReportFilterDto
{
    public int DatasetId { get; set; }
    public FilterGroupDto Filter { get; set; } = new();
}
