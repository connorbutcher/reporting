using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

public enum WidgetType
{
    DataTable,
    StaticText,
    ScatterChart,
    LineChart,
    BarChart,
    ComboChart,
    BoxPlot,
    Histogram,
    PivotTable,
    Kpi,

    // camelCase would give "xBarRChart", which doesn't match the config discriminator or the client.
    [JsonStringEnumMemberName("xbarRChart")]
    XBarRChart
}
