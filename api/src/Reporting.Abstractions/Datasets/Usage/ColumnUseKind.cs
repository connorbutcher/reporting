namespace Reporting.Abstractions;

/// <summary>What is using a column: a widget in the report, or the report's own page-level filter.</summary>
public enum ColumnUseKind
{
    Widget,
    ReportFilter,

    /// <summary>A filtered dataset built directly on top of this one, referencing the column in its saved filter.</summary>
    FilteredDataset
}
