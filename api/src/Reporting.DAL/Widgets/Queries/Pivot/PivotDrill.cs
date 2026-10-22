using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

/// <summary>Filters selecting the rows behind a pivot row or column key. Null when any field can't be expressed.</summary>
internal static class PivotDrill
{
    public static FilterGroupDto? ForRow(PivotNode node, List<PivotField> rowFields)
    {
        if (node.Parent is null)
        {
            return new FilterGroupDto();
        }
        var conditions = new List<FilterNodeDto>();
        for (var current = node; current.Parent is not null; current = current.Parent)
        {
            if (current.Tracker.Conditions(rowFields[current.Depth - 1]) is not { } own)
            {
                return null;
            }
            conditions.InsertRange(0, own);
        }
        return new FilterGroupDto { Join = FilterJoin.And, Children = conditions };
    }

    public static FilterGroupDto? ForColumn(PivotColumnKey key, List<PivotField> columnFields)
    {
        var conditions = new List<FilterNodeDto>();
        for (var i = 0; i < columnFields.Count; i++)
        {
            if (key.Trackers[i].Conditions(columnFields[i]) is not { } own)
            {
                return null;
            }
            conditions.AddRange(own);
        }
        return new FilterGroupDto { Join = FilterJoin.And, Children = conditions };
    }
}
