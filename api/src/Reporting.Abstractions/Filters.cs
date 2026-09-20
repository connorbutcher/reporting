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

/// <summary>A tree, so nesting is expressible even though the UI offers one level of grouping.</summary>
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

    /// <summary>Defaults to true, so conditions stored before toggling existed still apply. A disabled one is kept but skipped when translated.</summary>
    public bool Enabled { get; set; } = true;
}

/// <summary>Applies to every widget bound to <see cref="DatasetId"/>, AND-ed with the widget's own filter.</summary>
public class ReportFilterDto
{
    public int DatasetId { get; set; }
    public FilterGroupDto Filter { get; set; } = new();
}
