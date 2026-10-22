namespace Reporting.Database;

/// <summary>A null column is a row count.</summary>
internal sealed record PivotMeasureSeed(
    Guid? Column, string Aggregate, string Label, string ShowAs = "value", bool DataBars = false, string FormatRulesJson = "[]");
