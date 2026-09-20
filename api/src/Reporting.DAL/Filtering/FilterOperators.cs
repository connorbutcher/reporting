using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Filtering;

/// <summary>
/// Which operators each column type supports, and what operands each one needs. The
/// authoritative list lives in the FilterOperatorDefinitions table — <see cref="LoadCatalogueAsync"/>
/// reads it, and the API's FiltersController serves it to the client so the filter panel and
/// this class's own server-side validation (in <see cref="ConditionTranslator"/>) can never
/// disagree about what's offerable. A caller with no database in play — a unit test building a
/// filter predicate directly — gets the same data by falling back to <see cref="FilterOperatorSeedData"/>,
/// the in-memory list the table itself is seeded from.
/// </summary>
public static class FilterOperators
{
    private static readonly IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>> DefaultCatalogue =
        BuildCatalogue(FilterOperatorSeedData.Rows());

    // Loaded once per process and reused: this is fixed reference data that only ever changes via
    // a database edit or migration, never per-request, so there's no reason to re-query it on
    // every filter translated.
    private static IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>>? _loadedCatalogue;

    public static async Task<IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>>> LoadCatalogueAsync(
        ReportingDbContext db)
    {
        if (_loadedCatalogue is { } cached) return cached;

        var rows = await db.FilterOperatorDefinitions.AsNoTracking().ToListAsync();
        var catalogue = BuildCatalogue(rows);
        _loadedCatalogue = catalogue;
        return catalogue;
    }

    public static IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>> BuildCatalogue(
        IEnumerable<FilterOperatorDefinition> rows) =>
        rows
            .OrderBy(r => r.SortOrder)
            .GroupBy(r => r.ColumnType)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<FilterOperatorDto>)g.Select(ToDto).ToList());

    private static FilterOperatorDto ToDto(FilterOperatorDefinition d) => new()
    {
        Value = d.Operator,
        Label = d.Label,
        OperandCount = d.OperandCount,
        OperandKind = d.OperandKind
    };

    public static IReadOnlyList<FilterOperatorDto> For(
        DatasetColumnType type,
        IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>>? catalogue = null) =>
        (catalogue ?? DefaultCatalogue).TryGetValue(type, out var ops) ? ops : [];

    public static FilterOperatorDto? Find(
        DatasetColumnType type,
        FilterOperator op,
        IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>>? catalogue = null) =>
        For(type, catalogue).FirstOrDefault(o => o.Value == op);

    public static List<FilterOperatorsForTypeDto> ToCatalogueDto(
        IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>> catalogue) =>
        Enum.GetValues<DatasetColumnType>()
            .Select(type => new FilterOperatorsForTypeDto
            {
                Type = type,
                Operators = catalogue.TryGetValue(type, out var ops) ? ops.ToList() : []
            })
            .ToList();
}
