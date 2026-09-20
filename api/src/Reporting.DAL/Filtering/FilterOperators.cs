using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Filtering;

/// <summary>
/// Which operators each column type supports, and the operands each needs. The FilterOperatorDefinitions
/// table is authoritative: <see cref="LoadCatalogueAsync"/> reads it, the client is served it, and
/// <see cref="ConditionTranslator"/> validates against it, so they can't disagree. With no database (a unit
/// test) lookups fall back to <see cref="FilterOperatorSeedData"/>, which the table is seeded from.
/// </summary>
public static class FilterOperators
{
    private static readonly IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>> DefaultCatalogue =
        BuildCatalogue(FilterOperatorSeedData.Rows());

    // Fixed reference data that only changes via a migration, so it's loaded once per process.
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
