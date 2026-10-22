namespace Reporting.Abstractions;

public enum ColumnUseKind
{
    Widget,
    ReportFilter,

    /// <summary>A filtered dataset on top of this one, referencing the column in its saved filter.</summary>
    FilteredDataset
}
