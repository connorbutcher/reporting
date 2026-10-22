using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

/// <summary>Lays rows out as the client renders them: dimensions, then each column key's measures, then the row totals.</summary>
internal sealed class PivotLayout(
    PivotNode root, List<PivotMeasurePlan> measures, bool spread, List<string> columnKeys, bool rowTotals, List<PivotField> rowFields)
{
    public PivotRowDto Row(PivotNode node)
    {
        var path = node.Path();
        while (path.Count < rowFields.Count)
        {
            path.Add(string.Empty);
        }

        return new PivotRowDto
        {
            Dimensions = path,
            Values = Values(node),
            IsSubtotal = node.Depth > 0 && node.Depth < rowFields.Count,
            Depth = node.Depth,
            Drill = PivotDrill.ForRow(node, rowFields),
        };
    }

    private List<PivotCellDto> Values(PivotNode node)
    {
        var values = new List<PivotCellDto>();
        var parent = node.Parent ?? node;
        foreach (var key in spread ? columnKeys : [])
        {
            var cell = node.ByColumn.GetValueOrDefault(key);
            var rootCell = root.ByColumn.GetValueOrDefault(key);
            var parentCell = parent.ByColumn.GetValueOrDefault(key);
            values.AddRange(measures.Select((m, i) => PivotValues.Cell(node, cell, rootCell, parentCell, m, i)));
        }
        // Without column fields these are the group's own values; with them, the row totals.
        if (!spread || rowTotals)
        {
            values.AddRange(measures.Select((m, i) => PivotValues.Cell(node, node.Total, root.Total, parent.Total, m, i)));
        }
        return values;
    }
}
