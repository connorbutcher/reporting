namespace Reporting.Database;

/// <summary>
/// Work that has to wait for the first save: cells need their column's id, and widget configs and
/// report filters reference dataset ids.
/// </summary>
internal sealed class SeedBatch
{
    private readonly List<PendingCell> _cells = new();
    private readonly List<PendingTable> _tables = new();
    private readonly List<PendingChart> _charts = new();
    private readonly List<Action> _finalizers = new();

    public void AddCell(DatasetRow row, DatasetColumn column, string raw)
    {
        _cells.Add(new PendingCell(row, column, raw));
    }

    public void AddTable(Widget widget, Dataset dataset, string title, string[] columnNames)
    {
        _tables.Add(new PendingTable(widget, dataset, title, columnNames));
    }

    public void AddChart(Widget widget, Func<string> buildJson)
    {
        _charts.Add(new PendingChart(widget, buildJson));
    }

    public void AddFinalizer(Action apply)
    {
        _finalizers.Add(apply);
    }

    public void Apply()
    {
        foreach (var (row, column, raw) in _cells)
        {
            row.Cells.Add(CellValues.Create(column.Id, raw, column.Type));
        }

        foreach (var table in _tables)
        {
            table.Widget.ConfigJson = TableWidgetJson.Config(table.Title, table.Dataset, table.ColumnNames);
        }

        foreach (var (widget, buildJson) in _charts)
        {
            widget.ConfigJson = buildJson();
        }

        foreach (var apply in _finalizers)
        {
            apply();
        }
    }
}
