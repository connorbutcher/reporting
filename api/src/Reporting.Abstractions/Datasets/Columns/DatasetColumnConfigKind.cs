namespace Reporting.Abstractions;

/// <summary>Several column types share a shape, e.g. int and double are both Numeric.</summary>
public enum DatasetColumnConfigKind
{
    Numeric,
    Date,
    Bool,
    Text
}
