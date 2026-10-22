using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>Pairs a source dataset with its unsaved copy so cells and ids can be remapped after the first save.</summary>
internal sealed record DatasetCopy(
    Dataset Source,
    Dataset Copy,
    List<(DatasetColumn Source, DatasetColumn Copy)> ColumnPairs,
    List<(DatasetRow Source, DatasetRow Copy)> RowPairs);
