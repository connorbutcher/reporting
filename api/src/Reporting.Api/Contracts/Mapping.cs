using System.Text.Json;
using System.Text.Json.Serialization;
using Reporting.Api.Domain;

namespace Reporting.Api.Contracts;

public static class Mapping
{
    private static readonly JsonSerializerOptions ConfigJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        // The stored blob is written by us, but stay tolerant of discriminator order.
        AllowOutOfOrderMetadataProperties = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    public static ReportDto ToDto(this Report report) => new()
    {
        Id = report.Id,
        Name = report.Name,
        Columns = report.Columns,
        Rows = report.Rows,
        Widgets = report.Widgets.Select(w => w.ToDto()).ToList()
    };

    public static WidgetDto ToDto(this Widget widget) => new()
    {
        Id = widget.Id,
        Type = widget.Type,
        X = widget.X,
        Y = widget.Y,
        W = widget.W,
        H = widget.H,
        Config = JsonSerializer.Deserialize<WidgetConfig>(widget.ConfigJson, ConfigJsonOptions)!
    };

    public static void ApplyTo(this WidgetDto dto, Widget widget)
    {
        widget.Id = dto.Id;
        widget.Type = dto.Type;
        widget.X = dto.X;
        widget.Y = dto.Y;
        widget.W = dto.W;
        widget.H = dto.H;
        widget.ConfigJson = JsonSerializer.Serialize(dto.Config, typeof(WidgetConfig), ConfigJsonOptions);
    }

    public static DatasetSummaryDto ToSummaryDto(this Dataset dataset) => new()
    {
        Id = dataset.Id,
        Name = dataset.Name
    };

    public static DatasetSchemaDto ToSchemaDto(this Dataset dataset) => new()
    {
        Id = dataset.Id,
        Name = dataset.Name,
        Columns = dataset.Columns.OrderBy(c => c.Order).Select(c => c.ToDto()).ToList()
    };

    public static DatasetColumnDto ToDto(this DatasetColumn column) => new()
    {
        Id = column.Id,
        Name = column.Name,
        Type = column.Type,
        Order = column.Order,
        Configuration = JsonSerializer.Deserialize<JsonElement>(column.ConfigurationJson)
    };

    public static DatasetDataDto ToDataDto(this Dataset dataset) => new()
    {
        Id = dataset.Id,
        Name = dataset.Name,
        Rows = dataset.Rows.Select(r => new DatasetRowDto
        {
            Id = r.Id,
            Values = r.GetValues()
        }).ToList()
    };
}
