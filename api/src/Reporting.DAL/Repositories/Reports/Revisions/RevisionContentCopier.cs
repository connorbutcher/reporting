using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// Deep-copies tabs, widgets, filters and datasets from one revision into a freshly added one. RefIds carry
/// over so everything keeps its identity across versions; only int keys change, so the copied datasets' new
/// keys are remapped into widget configs, report filters and filtered-dataset sources.
/// </summary>
internal sealed class RevisionContentCopier(ReportingDbContext db)
{
    /// <summary><paramref name="target"/> must already be added to the context. A null source leaves one empty tab.</summary>
    public async Task CopyAsync(ReportRevision target, ReportRevision? source)
    {
        target.FiltersJson = source?.FiltersJson ?? "[]";

        if (source is null)
        {
            target.Tabs.Add(new Tab { RefId = Guid.NewGuid(), Name = "Tab 1", Order = 0 });
            await db.SaveChangesAsync();
            return;
        }

        CopyTabs(target, source);
        var datasetCopies = CopyDatasetShells(target, source);

        // Cells need their copied column's id, and configs their copied dataset's id.
        await db.SaveChangesAsync();
        if (datasetCopies.Count == 0)
        {
            return;
        }

        CopyCells(datasetCopies);
        var datasetIdMap = datasetCopies.ToDictionary(d => d.Source.Id, d => d.Copy.Id);
        RemapWidgets(target, datasetIdMap);
        RemapFilters(target, datasetIdMap);
        RemapFilteredSources(datasetCopies, datasetIdMap);
        await db.SaveChangesAsync();
    }

    private static void CopyTabs(ReportRevision target, ReportRevision source)
    {
        foreach (var sourceTab in source.Tabs)
        {
            var tabCopy = new Tab
            {
                RefId = sourceTab.RefId,
                Name = sourceTab.Name,
                Order = sourceTab.Order,
                Columns = sourceTab.Columns,
                Rows = sourceTab.Rows,
            };
            foreach (var widget in sourceTab.Widgets)
            {
                tabCopy.Widgets.Add(CopyWidget(widget));
            }
            target.Tabs.Add(tabCopy);
        }
    }

    private static Widget CopyWidget(Widget widget)
    {
        return new Widget
        {
            RefId = widget.RefId,
            Type = widget.Type,
            X = widget.X,
            Y = widget.Y,
            W = widget.W,
            H = widget.H,
            ConfigJson = widget.ConfigJson,
        };
    }

    private static List<DatasetCopy> CopyDatasetShells(ReportRevision target, ReportRevision source)
    {
        var copies = new List<DatasetCopy>();
        foreach (var sourceDataset in source.Datasets)
        {
            var copy = CopyDatasetShell(sourceDataset);
            target.Datasets.Add(copy.Copy);
            copies.Add(copy);
        }
        return copies;
    }

    private static DatasetCopy CopyDatasetShell(Dataset sourceDataset)
    {
        var copy = new Dataset
        {
            Name = sourceDataset.Name,
            DatasetSourceId = sourceDataset.DatasetSourceId,
            SourceConfigJson = sourceDataset.SourceConfigJson,
        };

        var columnPairs = new List<(DatasetColumn Source, DatasetColumn Copy)>();
        foreach (var column in sourceDataset.Columns)
        {
            var columnCopy = CopyColumn(column);
            copy.Columns.Add(columnCopy);
            columnPairs.Add((column, columnCopy));
        }

        var rowPairs = new List<(DatasetRow Source, DatasetRow Copy)>();
        foreach (var row in sourceDataset.Rows)
        {
            var rowCopy = new DatasetRow { RefId = row.RefId };
            copy.Rows.Add(rowCopy);
            rowPairs.Add((row, rowCopy));
        }

        return new DatasetCopy(sourceDataset, copy, columnPairs, rowPairs);
    }

    private static DatasetColumn CopyColumn(DatasetColumn column)
    {
        return new DatasetColumn
        {
            RefId = column.RefId,
            Name = column.Name,
            Type = column.Type,
            Order = column.Order,
            ConfigurationJson = column.ConfigurationJson,
            FormulaExpression = column.FormulaExpression,
            FormulaError = column.FormulaError,
        };
    }

    private void CopyCells(List<DatasetCopy> datasetCopies)
    {
        foreach (var dataset in datasetCopies)
        {
            var columnIdMap = dataset.ColumnPairs.ToDictionary(p => p.Source.Id, p => p.Copy.Id);
            foreach (var (sourceRow, rowCopy) in dataset.RowPairs)
            {
                CopyRowCells(sourceRow, rowCopy, columnIdMap);
            }
        }
    }

    private void CopyRowCells(DatasetRow sourceRow, DatasetRow rowCopy, Dictionary<int, int> columnIdMap)
    {
        foreach (var cell in sourceRow.Cells)
        {
            if (!columnIdMap.TryGetValue(cell.ColumnId, out var newColumnId))
            {
                continue;
            }

            db.DatasetCells.Add(new DatasetCell
            {
                RowId = rowCopy.Id,
                ColumnId = newColumnId,
                StringValue = cell.StringValue,
                NumberValue = cell.NumberValue,
                BoolValue = cell.BoolValue,
                DateValue = cell.DateValue,
            });
        }
    }

    private static void RemapWidgets(ReportRevision target, Dictionary<int, int> datasetIdMap)
    {
        foreach (var widget in target.Tabs.SelectMany(t => t.Widgets))
        {
            widget.ConfigJson = WidgetConfigRemapper.RemapDatasetIds(widget.ConfigJson, datasetIdMap);
        }
    }

    private static void RemapFilters(ReportRevision target, Dictionary<int, int> datasetIdMap)
    {
        var filters = target.GetFilters();
        var changed = false;
        foreach (var filter in filters)
        {
            if (datasetIdMap.TryGetValue(filter.DatasetId, out var mapped))
            {
                filter.DatasetId = mapped;
                changed = true;
            }
        }

        if (changed)
        {
            target.SetFilters(filters);
        }
    }

    /// <summary>A filtered dataset's source config was copied verbatim, so its base id still names the source revision's dataset.</summary>
    private static void RemapFilteredSources(List<DatasetCopy> datasetCopies, Dictionary<int, int> datasetIdMap)
    {
        foreach (var copy in datasetCopies.Select(d => d.Copy))
        {
            if (copy.DatasetSourceId != DatasetSourceIds.Filtered)
            {
                continue;
            }

            if (DatasetMapping.TryGetSourceConfig(copy.SourceConfigJson) is not FilteredDatasetSourceConfig config)
            {
                continue;
            }

            if (!datasetIdMap.TryGetValue(config.BaseDatasetId, out var mappedBaseId))
            {
                continue;
            }

            config.BaseDatasetId = mappedBaseId;
            copy.SetSourceConfig(config);
        }
    }
}
