using System.Linq.Expressions;
using Reporting.Abstractions;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.DAL.Filtering;

/// <summary>Why a filter couldn't be translated: a 400, not a silent mismatch.</summary>
public sealed class FilterException(string message) : Exception(message);

/// <summary>
/// Turns a filter tree into a predicate over <see cref="DatasetRow"/>. Each condition is a plain lambda
/// over the row's cells, which EF translates to an indexed EXISTS, so the only expression work here is
/// joining predicates for AND/OR groups. Per-type logic is in <see cref="ConditionTranslator"/> and its helpers.
/// </summary>
public static class FilterTranslator
{
    /// <param name="toleranceByColumn">Resolved bounds per column RefId. Omitted without a banding context, so a tolerance condition narrows nothing.</param>
    /// <param name="operatorCatalogue">The database-loaded catalogue (<see cref="FilterOperators.LoadCatalogueAsync"/>). Omitted only without a database, which falls back to the seed data.</param>
    public static Expression<Func<DatasetRow, bool>>? Build(
        FilterNodeDto? node,
        IReadOnlyDictionary<Guid, DatasetColumn> columnsById,
        IReadOnlyDictionary<Guid, ToleranceBounds?>? toleranceByColumn = null,
        IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>>? operatorCatalogue = null) =>
        node is null ? null : Translate(node, new TranslationContext(columnsById, toleranceByColumn, operatorCatalogue));

    /// <summary>Narrows <paramref name="rows"/> to the matches, or returns them as they are when there's no filter. Every query applies its filter through this.</summary>
    public static IQueryable<DatasetRow> Apply(
        IQueryable<DatasetRow> rows,
        FilterGroupDto? filter,
        IReadOnlyDictionary<Guid, DatasetColumn> columnsById,
        IReadOnlyDictionary<Guid, ToleranceBounds?>? toleranceByColumn = null,
        IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>>? operatorCatalogue = null)
    {
        var predicate = Build(filter, columnsById, toleranceByColumn, operatorCatalogue);
        return predicate is null ? rows : rows.Where(predicate);
    }

    private static Expression<Func<DatasetRow, bool>>? Translate(FilterNodeDto node, TranslationContext context) => node switch
    {
        FilterGroupDto group => TranslateGroup(group, context),
        // Disabled conditions stay in the tree but never narrow rows.
        FilterConditionDto { Enabled: false } => null,
        FilterConditionDto c when ToleranceConditionTranslator.IsTolerance(c.Operator) =>
            ToleranceConditionTranslator.Translate(c, context),
        FilterConditionDto condition => ConditionTranslator.Translate(condition, context),
        _ => throw new FilterException("Unknown filter node.")
    };

    private static Expression<Func<DatasetRow, bool>>? TranslateGroup(FilterGroupDto group, TranslationContext context)
    {
        var parts = group.Children
            .Select(child => Translate(child, context))
            .OfType<Expression<Func<DatasetRow, bool>>>()
            .ToList();

        // An empty group filters nothing rather than matching nothing, so a half-built filter can't blank the table.
        return PredicateCombiner.Combine(parts, group.Join);
    }
}
