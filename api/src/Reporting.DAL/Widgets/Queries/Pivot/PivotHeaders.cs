using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

internal static class PivotHeaders
{
    public static PivotFieldDto Field(PivotField field)
    {
        return new PivotFieldDto { ColumnId = field.Column.RefId, Label = FieldLabel(field) };
    }

    public static PivotMeasureColumnDto Measure(PivotMeasurePlan measure)
    {
        return new PivotMeasureColumnDto
        {
            Key = $"m{measure.Index}",
            Label = string.IsNullOrWhiteSpace(measure.Label) ? MeasureLabel(measure) : measure.Label,
            ColumnId = measure.Column?.RefId,
            Aggregate = measure.Aggregate,
            ShowAs = measure.ShowAs,
        };
    }

    /// <summary>The column name, with the period when grouped: "Made (month)".</summary>
    private static string FieldLabel(PivotField field)
    {
        return field.Grouping is { } grouping ? $"{field.Column.Name} ({grouping.ToString().ToLowerInvariant()})" : field.Column.Name;
    }

    /// <summary>"Count", else "&lt;Aggregate&gt; of &lt;Column&gt;", plus any "show as".</summary>
    private static string MeasureLabel(PivotMeasurePlan measure)
    {
        var name = measure.Column?.Name;
        var label = measure.Aggregate switch
        {
            PivotAggregate.Count => "Count",
            PivotAggregate.CountDistinct => $"Distinct {name}",
            PivotAggregate.Sum => $"Sum of {name}",
            PivotAggregate.Average => $"Average of {name}",
            PivotAggregate.Min => $"Min of {name}",
            PivotAggregate.Max => $"Max of {name}",
            PivotAggregate.Median => $"Median of {name}",
            _ => name ?? "Value",
        };
        return measure.ShowAs switch
        {
            PivotShowAs.PercentOfTotal => $"{label} (% of total)",
            PivotShowAs.PercentOfParent => $"{label} (% of parent)",
            _ => label,
        };
    }
}
