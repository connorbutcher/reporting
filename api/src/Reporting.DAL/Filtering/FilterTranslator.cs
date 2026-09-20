using System.Linq.Expressions;
using Reporting.Abstractions;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.DAL.Filtering;

/// <summary>Why a filter couldn't be translated, for a 400 rather than a silent mismatch.</summary>
public sealed class FilterException(string message) : Exception(message);

/// <summary>
/// Turns a filter tree into an <see cref="Expression"/> predicate over <see cref="DatasetRow"/>.
/// Every condition is an ordinary lambda over the row's cells, which EF translates to an indexed
/// EXISTS — so the only expression-tree work here is combining predicates for AND/OR groups.
/// Per-column-type condition logic lives in <see cref="ConditionTranslator"/> and its type-specific
/// helpers; the tolerance operators in <see cref="ToleranceConditionTranslator"/>.
/// </summary>
public static class FilterTranslator
{
    /// <param name="toleranceByColumn">
    /// Resolved tolerance bounds per column RefId, for the tolerance operators. Supplied by the
    /// widget query (which already resolves banding); omitted where there's no banding context, in
    /// which case a tolerance condition simply narrows nothing.
    /// </param>
    /// <param name="operatorCatalogue">
    /// The database-loaded operator catalogue (see <see cref="FilterOperators.LoadCatalogueAsync"/>),
    /// for validating each condition's operator. Omitted only where there's no database in play (a
    /// unit test building a predicate directly), in which case validation falls back to the same
    /// data the table is seeded from.
    /// </param>
    public static Expression<Func<DatasetRow, bool>>? Build(
        FilterNodeDto? node,
        IReadOnlyDictionary<Guid, DatasetColumn> columnsById,
        IReadOnlyDictionary<Guid, ToleranceBounds?>? toleranceByColumn = null,
        IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>>? operatorCatalogue = null) =>
        node is null ? null : Translate(node, columnsById, toleranceByColumn, operatorCatalogue);

    /// <summary>
    /// Narrows <paramref name="rows"/> to those matching the filter, or returns them unfiltered
    /// when there's nothing to filter by. Every dataset/widget query applies its filter through
    /// this one call, so how a translated predicate is applied only needs to change in one place.
    /// </summary>
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

    private static Expression<Func<DatasetRow, bool>>? Translate(
        FilterNodeDto node,
        IReadOnlyDictionary<Guid, DatasetColumn> columnsById,
        IReadOnlyDictionary<Guid, ToleranceBounds?>? toleranceByColumn,
        IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>>? operatorCatalogue) => node switch
    {
        FilterGroupDto group => TranslateGroup(group, columnsById, toleranceByColumn, operatorCatalogue),
        // A disabled condition is retained in the tree but never narrows rows.
        FilterConditionDto { Enabled: false } => null,
        FilterConditionDto c when ToleranceConditionTranslator.IsTolerance(c.Operator) =>
            ToleranceConditionTranslator.Translate(c, columnsById, toleranceByColumn),
        FilterConditionDto condition => ConditionTranslator.Translate(condition, columnsById, operatorCatalogue),
        _ => throw new FilterException("Unknown filter node.")
    };

    private static Expression<Func<DatasetRow, bool>>? TranslateGroup(
        FilterGroupDto group,
        IReadOnlyDictionary<Guid, DatasetColumn> columnsById,
        IReadOnlyDictionary<Guid, ToleranceBounds?>? toleranceByColumn,
        IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>>? operatorCatalogue)
    {
        var parts = group.Children
            .Select(child => Translate(child, columnsById, toleranceByColumn, operatorCatalogue))
            .Where(p => p is not null)
            .Cast<Expression<Func<DatasetRow, bool>>>()
            .ToList();

        // An empty group filters nothing, rather than matching nothing — a
        // half-built filter in the panel shouldn't blank the table.
        if (parts.Count == 0) return null;

        var combined = parts[0];
        for (var i = 1; i < parts.Count; i++)
        {
            combined = group.Join == FilterJoin.Or
                ? Combine(combined, parts[i], Expression.OrElse)
                : Combine(combined, parts[i], Expression.AndAlso);
        }
        return combined;
    }

    private static Expression<Func<DatasetRow, bool>> Combine(
        Expression<Func<DatasetRow, bool>> left,
        Expression<Func<DatasetRow, bool>> right,
        Func<Expression, Expression, BinaryExpression> join)
    {
        // Both lambdas declare their own parameter; rebind the right one onto the
        // left's so the combined body refers to a single row parameter.
        var parameter = left.Parameters[0];
        var rebound = new ParameterRebinder(right.Parameters[0], parameter).Visit(right.Body);
        return Expression.Lambda<Func<DatasetRow, bool>>(join(left.Body, rebound), parameter);
    }

    private sealed class ParameterRebinder(ParameterExpression from, ParameterExpression to) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) =>
            node == from ? to : base.VisitParameter(node);
    }
}
