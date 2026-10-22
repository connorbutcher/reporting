namespace Reporting.Abstractions;

/// <summary>
/// The display-configuration shape a column formats through. Several
/// <see cref="DatasetColumnType"/>s share a shape (int and double both format as
/// <see cref="DatasetColumnConfigKind.Numeric"/>), so the config is keyed by this
/// kind rather than by the column type directly.
/// </summary>
public enum DatasetColumnConfigKind
{
    Numeric,
    Date,
    Bool,
    Text
}
