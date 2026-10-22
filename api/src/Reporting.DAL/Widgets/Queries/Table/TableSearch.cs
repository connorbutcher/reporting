using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

internal static class TableSearch
{
    /// <summary>
    /// Rows where any requested column's text contains <paramref name="search"/>. Every cell keeps its
    /// canonical text, so this reaches numbers and dates too.
    /// </summary>
    public static Expression<Func<DatasetRow, bool>>? Predicate(
        string? search, List<DataTableColumnSetting> settings, Dictionary<Guid, DatasetColumn> columnsByRef)
    {
        var text = search?.Trim();
        if (string.IsNullOrEmpty(text))
        {
            return null;
        }

        var ids = settings
            .Select(s => columnsByRef.GetValueOrDefault(s.ColumnId)?.Id)
            .OfType<int>()
            .ToList();
        if (ids.Count == 0)
        {
            return null;
        }

        var pattern = $"%{text.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_")}%";
        return r => r.Cells.Any(c => ids.Contains(c.ColumnId) && c.StringValue != null && EF.Functions.Like(c.StringValue, pattern, "\\"));
    }
}
