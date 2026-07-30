using System.Text.Json;
using System.Text.Json.Serialization;
using Reporting.Api.Domain;

namespace Reporting.Api.Contracts;

public static class Mapping
{
    private static readonly JsonSerializerOptions ConfigJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    public static ReportDto ToDto(this Report report) => new()
    {
        Id = report.Id,
        Name = report.Name,
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
        Fields = dataset.Records
            .SelectMany(r => r.Fields)
            .Select(f => new DatasetFieldSchemaDto { DisplayName = f.DisplayName, DataType = f.DataType })
            .DistinctBy(f => (f.DisplayName, f.DataType))
            .ToList()
    };

    public static DatasetDataDto ToDataDto(this Dataset dataset) => new()
    {
        Id = dataset.Id,
        Name = dataset.Name,
        Records = dataset.Records.Select(r => new DatasetRecordDto
        {
            Id = r.Id,
            Fields = r.Fields.Select(f => new DatasetFieldDto
            {
                Id = f.Id,
                DisplayName = f.DisplayName,
                DataType = f.DataType,
                Value = f.GetValue()
            }).ToList()
        }).ToList()
    };
}
