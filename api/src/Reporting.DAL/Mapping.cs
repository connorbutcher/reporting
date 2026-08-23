using System.Text.Json;
using System.Text.Json.Serialization;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL;

public static class Mapping
{
    private static readonly JsonSerializerOptions ConfigJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        // The stored blob is written by us, but stay tolerant of discriminator order.
        AllowOutOfOrderMetadataProperties = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    public static FolderDto ToDto(this Folder folder) => new()
    {
        Id = folder.Id,
        Name = folder.Name,
        ParentFolderId = folder.ParentFolderId,
        ModifiedAt = folder.UpdatedAt
    };

    /// <summary>Assumes <see cref="Report.Revisions"/> is loaded.</summary>
    public static ReportSummaryDto ToSummaryDto(this Report report) => new()
    {
        Id = report.Id,
        Number = report.Number,
        Name = report.Name,
        FolderId = report.FolderId,
        HasDraft = report.Revisions.Any(r => r.Kind == RevisionKind.Draft),
        LatestVersionNumber = report.Revisions
            .Where(r => r.Kind == RevisionKind.Published)
            .Select(r => r.VersionNumber)
            .DefaultIfEmpty(null)
            .Max(),
        ModifiedAt = report.UpdatedAt
    };

    /// <summary>Assumes <see cref="Report.Revisions"/> is loaded, to derive draft/latest-version state.</summary>
    public static ReportSearchResultDto ToSearchResultDto(this Report report, string folderPath) => new()
    {
        Id = report.Id,
        Number = report.Number,
        Name = report.Name,
        HasDraft = report.Revisions.Any(r => r.Kind == RevisionKind.Draft),
        LatestVersionNumber = report.Revisions
            .Where(r => r.Kind == RevisionKind.Published)
            .Select(r => r.VersionNumber)
            .DefaultIfEmpty(null)
            .Max(),
        ModifiedAt = report.UpdatedAt,
        FolderPath = folderPath
    };

    public static ReportRevisionDto ToContentDto(this ReportRevision revision, Report report) => new()
    {
        ReportId = report.Id,
        Name = report.Name,
        Columns = revision.Columns,
        Rows = revision.Rows,
        Widgets = revision.Widgets.Select(w => w.ToDto()).ToList(),
        Notes = revision.Notes,
        Filters = revision.GetFilters()
    };

    public static List<ReportFilterDto> GetFilters(this ReportRevision revision)
    {
        // A revision created before filters existed carries a blank blob, and a
        // malformed one shouldn't take the whole report down — either way, the
        // honest answer is "no report-level filters".
        if (string.IsNullOrWhiteSpace(revision.FiltersJson)) return [];

        try
        {
            return JsonSerializer.Deserialize<List<ReportFilterDto>>(revision.FiltersJson, ConfigJsonOptions) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public static void SetFilters(this ReportRevision revision, List<ReportFilterDto> filters) =>
        revision.FiltersJson = JsonSerializer.Serialize(filters, ConfigJsonOptions);

    public static ReportVersionSummaryDto ToVersionSummaryDto(this ReportRevision revision) => new()
    {
        VersionNumber = revision.VersionNumber!.Value,
        PublishedAt = revision.PublishedAt!.Value,
        Notes = revision.Notes
    };

    public static WidgetDto ToDto(this Widget widget) => new()
    {
        Id = widget.RefId,
        Type = widget.Type,
        X = widget.X,
        Y = widget.Y,
        W = widget.W,
        H = widget.H,
        Config = JsonSerializer.Deserialize<WidgetConfig>(widget.ConfigJson, ConfigJsonOptions)!
    };

    public static void ApplyTo(this WidgetDto dto, Widget widget)
    {
        widget.RefId = dto.Id;
        widget.Type = dto.Type;
        widget.X = dto.X;
        widget.Y = dto.Y;
        widget.W = dto.W;
        widget.H = dto.H;
        widget.ConfigJson = JsonSerializer.Serialize(dto.Config, typeof(WidgetConfig), ConfigJsonOptions);
    }

    /// <summary>
    /// Rewrites the dataset primary keys a widget config references (its primary dataset and any
    /// tolerance source datasets) through <paramref name="map"/> — used when a revision is copied and
    /// its datasets are re-inserted under new ids. Ids absent from the map are left untouched.
    /// </summary>
    public static string RemapConfigDatasetIds(string configJson, IReadOnlyDictionary<int, int> map)
    {
        var config = JsonSerializer.Deserialize<WidgetConfig>(configJson, ConfigJsonOptions)!;

        int? Remap(int? id) => id is { } v && map.TryGetValue(v, out var mapped) ? mapped : id;
        int Remap0(int id) => map.TryGetValue(id, out var mapped) ? mapped : id;

        switch (config)
        {
            case DataTableWidgetConfig table:
                table.DatasetId = Remap(table.DatasetId);
                foreach (var column in table.Columns)
                    if (column.Tolerance is { } tolerance) tolerance.SourceDatasetId = Remap0(tolerance.SourceDatasetId);
                break;
            case ChartWidgetConfig chart:
                chart.DatasetId = Remap(chart.DatasetId);
                foreach (var binding in chart.Bindings) binding.DatasetId = Remap(binding.DatasetId);
                foreach (var band in chart.ToleranceBands) band.SourceDatasetId = Remap0(band.SourceDatasetId);
                break;
        }

        return JsonSerializer.Serialize(config, typeof(WidgetConfig), ConfigJsonOptions);
    }

    public static DatasetSourceDto ToDto(this DatasetSource source) => new()
    {
        Id = source.Id,
        Key = source.Key,
        Name = source.Name
    };

    /// <summary>Assumes <see cref="Dataset.Source"/> is loaded.</summary>
    public static DatasetSummaryDto ToSummaryDto(this Dataset dataset) => new()
    {
        Id = dataset.Id,
        Name = dataset.Name,
        Source = dataset.Source!.Key
    };

    /// <summary>Assumes <see cref="Dataset.Source"/> and <see cref="Dataset.Columns"/> are loaded.</summary>
    public static DatasetSchemaDto ToSchemaDto(this Dataset dataset) => new()
    {
        Id = dataset.Id,
        Name = dataset.Name,
        SourceId = dataset.DatasetSourceId,
        Source = dataset.Source!.Key,
        SourceConfig = dataset.GetSourceConfig(),
        Columns = dataset.Columns.OrderBy(c => c.Order).Select(c => c.ToDto()).ToList()
    };

    /// <summary>
    /// The dataset's source configuration, deserialized from its blob. A blank blob (a freshly
    /// created or backfilled dataset) or one that doesn't match the current source falls back to
    /// that source's default config — assumes <see cref="Dataset.Source"/> is loaded.
    /// </summary>
    public static DatasetSourceConfig GetSourceConfig(this Dataset dataset)
    {
        if (!string.IsNullOrWhiteSpace(dataset.SourceConfigJson))
        {
            try
            {
                var config = JsonSerializer.Deserialize<DatasetSourceConfig>(dataset.SourceConfigJson, ConfigJsonOptions);
                if (config is not null && config.SourceKey == dataset.Source!.Key) return config;
            }
            catch (Exception ex) when (ex is JsonException or NotSupportedException)
            {
                // A blank object ("{}") has no discriminator (NotSupportedException) and a malformed
                // blob is a JsonException — either way, fall through to the source's default below.
            }
        }

        return DatasetSourceConfigs.Default(dataset.Source!.Key);
    }

    public static void SetSourceConfig(this Dataset dataset, DatasetSourceConfig config) =>
        dataset.SourceConfigJson = JsonSerializer.Serialize(config, typeof(DatasetSourceConfig), ConfigJsonOptions);

    public static DatasetColumnDto ToDto(this DatasetColumn column) => new()
    {
        Id = column.RefId,
        Name = column.Name,
        Type = column.Type,
        Order = column.Order,
        Configuration = JsonSerializer.Deserialize<JsonElement>(column.ConfigurationJson)
    };

    public static DatasetDataDto ToDataDto(this Dataset dataset) =>
        BuildDataDto(dataset, dataset.Rows);

    /// <summary>The same shape as <see cref="ToDataDto"/> but over an already-narrowed row set.</summary>
    public static DatasetDataDto BuildDataDto(Dataset dataset, IEnumerable<DatasetRow> rows)
    {
        var columnRefById = dataset.Columns.ToDictionary(c => c.Id, c => c.RefId);
        return new()
        {
            Id = dataset.Id,
            Name = dataset.Name,
            Rows = rows.Select(r => r.ToDto(columnRefById)).ToList()
        };
    }

    /// <summary>Assumes <see cref="DatasetRow.Cells"/> is loaded. Cells are keyed by their column's
    /// stable RefId, resolved via <paramref name="columnRefById"/> (column int id → RefId).</summary>
    public static DatasetRowDto ToDto(this DatasetRow row, IReadOnlyDictionary<int, Guid> columnRefById) => new()
    {
        Id = row.RefId,
        // Cells with no text carry no information the client can use, and leaving
        // them out keeps the payload identical to the old JSON-blob shape.
        Values = row.Cells
            .Where(c => c.StringValue is not null && columnRefById.ContainsKey(c.ColumnId))
            .ToDictionary(c => columnRefById[c.ColumnId], c => c.StringValue!)
    };
}
