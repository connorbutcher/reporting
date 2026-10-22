using Reporting.Abstractions;

namespace Reporting.DAL.Repositories;

/// <summary>A dataset's column types and everything in its revision that can reference them.</summary>
internal sealed record ColumnUsageSource(
    Dictionary<Guid, DatasetColumnType> ColumnTypes,
    List<ScanWidget> Widgets,
    List<string> FilterJsons,
    List<ScanFilteredDataset> FilteredDatasets);
