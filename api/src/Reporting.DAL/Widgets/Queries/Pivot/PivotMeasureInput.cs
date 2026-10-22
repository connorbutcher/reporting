namespace Reporting.DAL.Widgets;

/// <summary>One row's input to one measure: its number (null if none) and its trimmed text (null if blank).</summary>
public readonly record struct PivotMeasureInput(double? Number, string? Text);
