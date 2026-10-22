using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>Every widget's stored config, discriminated on "type".</summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(DataTableWidgetConfig), typeDiscriminator: "dataTable")]
[JsonDerivedType(typeof(StaticTextWidgetConfig), typeDiscriminator: "staticText")]
[JsonDerivedType(typeof(ScatterChartWidgetConfig), typeDiscriminator: "scatterChart")]
[JsonDerivedType(typeof(LineChartWidgetConfig), typeDiscriminator: "lineChart")]
[JsonDerivedType(typeof(BarChartWidgetConfig), typeDiscriminator: "barChart")]
[JsonDerivedType(typeof(ComboChartWidgetConfig), typeDiscriminator: "comboChart")]
[JsonDerivedType(typeof(BoxPlotWidgetConfig), typeDiscriminator: "boxPlot")]
[JsonDerivedType(typeof(HistogramWidgetConfig), typeDiscriminator: "histogram")]
[JsonDerivedType(typeof(PivotTableWidgetConfig), typeDiscriminator: "pivotTable")]
[JsonDerivedType(typeof(XBarRChartWidgetConfig), typeDiscriminator: "xbarRChart")]
[JsonDerivedType(typeof(KpiWidgetConfig), typeDiscriminator: "kpi")]
public abstract class WidgetConfig
{
    public string Title { get; set; } = "Widget";
    public bool ShowTitle { get; set; } = true;
}
