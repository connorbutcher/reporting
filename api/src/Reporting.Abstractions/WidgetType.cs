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

    // The default camelCase JSON naming policy would lower only the first letter, giving
    // "xBarRChart" — mismatched with the widget config's own "xbarRChart" discriminator
    // (JsonDerivedType in WidgetConfig.cs) and the frontend's widget type literal.
    [JsonStringEnumMemberName("xbarRChart")]
    XBarRChart
}
