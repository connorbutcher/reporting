using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// A pivot request resolved against the dataset's columns. Unknown columns drop out, a row field isn't also
/// spread across the top, and every measure but Count needs a resolvable column.
/// </summary>
internal sealed record PivotPlan(List<PivotField> RowFields, List<PivotField> ColumnFields, List<PivotMeasurePlan> Measures)
{
    public static PivotPlan Resolve(PivotQueryDto dto, Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        var groupings = dto.FieldGroupings
            .GroupBy(g => g.ColumnId)
            .ToDictionary(g => g.Key, g => g.Last().Grouping);
        var rowFields = Fields(dto.RowFields, columnsByRef, groupings);
        var rowFieldIds = rowFields.Select(f => f.Column.RefId).ToHashSet();
        var columnFields = Fields(dto.ColumnFields.Where(c => !rowFieldIds.Contains(c)), columnsByRef, groupings);

        var measures = dto.Measures
            .Select((m, i) => new PivotMeasurePlan(
                i, m.Aggregate, m.ShowAs, m.Label,
                m.Aggregate == PivotAggregate.Count ? null : columnsByRef.GetValueOrDefault(m.ColumnId ?? Guid.Empty)))
            .Where(m => m.Aggregate == PivotAggregate.Count || m.Column is not null)
            .ToList();

        return new PivotPlan(rowFields, columnFields, measures);
    }

    public HashSet<int> NeededColumnIds()
    {
        var ids = new HashSet<int>(RowFields.Concat(ColumnFields).Select(f => f.Column.Id));
        foreach (var measure in Measures)
        {
            if (measure.Column is not null)
            {
                ids.Add(measure.Column.Id);
            }
        }
        return ids;
    }

    private static List<PivotField> Fields(
        IEnumerable<Guid> ids, Dictionary<Guid, DatasetColumn> columnsByRef, Dictionary<Guid, DateGrouping> groupings)
    {
        return ids
            .Distinct()
            .Select(columnRef => columnsByRef.GetValueOrDefault(columnRef))
            .OfType<DatasetColumn>()
            .Select(c => new PivotField(c, groupings.TryGetValue(c.RefId, out var g) ? g : null))
            .ToList();
    }
}
