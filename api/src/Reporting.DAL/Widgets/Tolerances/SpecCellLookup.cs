namespace Reporting.DAL.Widgets;

/// <summary>A spec cell's number by (dataset, row RefId, column RefId), via the int keys cells are stored under.</summary>
internal sealed class SpecCellLookup(
    Dictionary<(int DatasetId, Guid RefId), int> rowPkByRef,
    Dictionary<(int DatasetId, Guid RefId), int> columnPkByRef,
    Dictionary<(int RowId, int ColumnId), double?> byRowColumn)
{
    public double? Value(int datasetId, Guid rowRef, Guid columnRef)
    {
        return rowPkByRef.TryGetValue((datasetId, rowRef), out var rp)
            && columnPkByRef.TryGetValue((datasetId, columnRef), out var cp)
                ? byRowColumn.GetValueOrDefault((rp, cp))
                : null;
    }
}
