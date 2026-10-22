using System.Globalization;
using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

internal static class PivotValues
{
    /// <summary>The reduced value, or its share of the grand total or of the enclosing group.</summary>
    public static double? Shown(
        PivotNode node, PivotCellAcc? cell, PivotCellAcc? totalCell, PivotCellAcc? parentCell, PivotMeasurePlan measure, int index)
    {
        var value = Raw(cell, measure, index);
        if (measure.ShowAs == PivotShowAs.Value || value is not { } v)
        {
            return value;
        }
        var denominator = measure.ShowAs == PivotShowAs.PercentOfTotal
            ? Raw(totalCell, measure, index)
            : Raw(node.Parent is null ? cell : parentCell, measure, index);
        return denominator is { } d && d != 0 ? v / d : null;
    }

    public static PivotCellDto Cell(
        PivotNode node, PivotCellAcc? cell, PivotCellAcc? totalCell, PivotCellAcc? parentCell, PivotMeasurePlan measure, int index)
    {
        if (Shown(node, cell, totalCell, parentCell, measure, index) is not { } v)
        {
            return new PivotCellDto { Value = null, DisplayValue = null };
        }
        if (measure.ShowAs != PivotShowAs.Value)
        {
            return new PivotCellDto { Value = v, DisplayValue = (v * 100).ToString("0.0", CultureInfo.InvariantCulture) + "%" };
        }

        // Counts are plain tallies; other aggregates carry the measure column's numeric formatting.
        var tally = measure.Aggregate is PivotAggregate.Count or PivotAggregate.CountDistinct;
        var config = tally ? null : measure.Column?.GetConfig() as NumericColumnConfig;
        return new PivotCellDto { Value = v, DisplayValue = CellFormatter.Number(v, config) };
    }

    private static double? Raw(PivotCellAcc? cell, PivotMeasurePlan measure, int index)
    {
        if (cell is null || cell.RowCount == 0)
        {
            return null;
        }
        var acc = cell.Measures[index];
        return measure.Aggregate switch
        {
            PivotAggregate.Count => cell.RowCount,
            PivotAggregate.CountDistinct => acc.Distinct!.Count,
            PivotAggregate.Sum => acc.Count > 0 ? acc.Sum : null,
            PivotAggregate.Average => acc.Count > 0 ? acc.Sum / acc.Count : null,
            PivotAggregate.Min => acc.Count > 0 ? acc.Min : null,
            PivotAggregate.Max => acc.Count > 0 ? acc.Max : null,
            PivotAggregate.Median => acc.Count > 0 ? Median(acc.Values!) : null,
            _ => null,
        };
    }

    private static double Median(List<double> values)
    {
        var sorted = values.Order().ToList();
        var middle = sorted.Count / 2;
        return sorted.Count % 2 == 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
    }
}
