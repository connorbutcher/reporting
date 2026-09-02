using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>
/// The base every widget's stored config extends, discriminated on its <c>type</c>.
/// Concrete shapes live alongside in <see cref="DataTableWidgetConfig"/>,
/// <see cref="StaticTextWidgetConfig"/>, and the chart configs.
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(DataTableWidgetConfig), typeDiscriminator: "dataTable")]
[JsonDerivedType(typeof(StaticTextWidgetConfig), typeDiscriminator: "staticText")]
[JsonDerivedType(typeof(ScatterChartWidgetConfig), typeDiscriminator: "scatterChart")]
[JsonDerivedType(typeof(LineChartWidgetConfig), typeDiscriminator: "lineChart")]
[JsonDerivedType(typeof(BarChartWidgetConfig), typeDiscriminator: "barChart")]
[JsonDerivedType(typeof(BoxPlotWidgetConfig), typeDiscriminator: "boxPlot")]
public abstract class WidgetConfig
{
    public string Title { get; set; } = "Widget";
    public bool ShowTitle { get; set; } = true;
}
