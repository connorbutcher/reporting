using System.Text.Json;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL;

public static class LayoutMapping
{
    public static TabDto ToDto(this Tab tab)
    {
        return new()
        {
            Id = tab.RefId,
            Name = tab.Name,
            Order = tab.Order,
            Columns = tab.Columns,
            Rows = tab.Rows,
            Widgets = tab.Widgets.Select(w => w.ToDto()).ToList()
        };
    }

    /// <summary>Applies a tab's own fields (not its widgets — the repository diffs those by RefId).</summary>
    public static void ApplyTo(this TabDto dto, Tab tab)
    {
        tab.RefId = dto.Id;
        tab.Name = dto.Name;
        tab.Order = dto.Order;
        tab.Columns = Math.Max(1, dto.Columns);
        tab.Rows = Math.Max(1, dto.Rows);
    }

    public static WidgetDto ToDto(this Widget widget)
    {
        return new()
        {
            Id = widget.RefId,
            Type = widget.Type,
            X = widget.X,
            Y = widget.Y,
            W = widget.W,
            H = widget.H,
            Config = JsonSerializer.Deserialize<WidgetConfig>(widget.ConfigJson, ConfigJson.Options)!
        };
    }

    public static void ApplyTo(this WidgetDto dto, Widget widget)
    {
        widget.RefId = dto.Id;
        widget.Type = dto.Type;
        widget.X = dto.X;
        widget.Y = dto.Y;
        widget.W = dto.W;
        widget.H = dto.H;
        widget.ConfigJson = JsonSerializer.Serialize(dto.Config, typeof(WidgetConfig), ConfigJson.Options);
    }
}
