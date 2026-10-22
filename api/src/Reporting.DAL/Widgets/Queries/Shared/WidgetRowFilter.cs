using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.DAL.Repositories;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

public static class WidgetRowFilter
{
    /// <param name="toleranceByColumn">Lets a tolerance condition in the widget's filter reuse a resolved band.</param>
    public static async Task<WidgetRows> FilterAsync(
        ReportingDbContext db,
        ResolvedDataset resolved,
        Dictionary<Guid, DatasetColumn> columnsByRef,
        FilterGroupDto? filter,
        IReadOnlyDictionary<Guid, ToleranceBounds?>? toleranceByColumn = null)
    {
        var operatorCatalogue = await FilterOperators.LoadCatalogueAsync(db);
        var baseRows = db.DatasetRows.Where(r => r.DatasetId == resolved.Physical.Id);
        var all = FilterTranslator.Apply(baseRows, resolved.MandatoryFilter, columnsByRef, operatorCatalogue: operatorCatalogue);
        var matching = FilterTranslator.Apply(all, filter, columnsByRef, toleranceByColumn, operatorCatalogue);
        var (total, matched) = await RowCounts.CountRowsAsync(all, matching);
        return new WidgetRows(all, matching, total, matched);
    }
}
