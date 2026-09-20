using System.Linq.Expressions;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Filtering;

/// <summary>Joins row predicates with AND or OR into one lambda over a single row parameter.</summary>
internal static class PredicateCombiner
{
    /// <returns>Null for no parts.</returns>
    public static Expression<Func<DatasetRow, bool>>? Combine(
        IReadOnlyList<Expression<Func<DatasetRow, bool>>> parts,
        FilterJoin join)
    {
        if (parts.Count == 0) return null;

        // Each lambda declares its own row parameter; rebind them onto the first's.
        var parameter = parts[0].Parameters[0];
        var body = parts[0].Body;
        for (var i = 1; i < parts.Count; i++)
        {
            var rebound = new ParameterRebinder(parts[i].Parameters[0], parameter).Visit(parts[i].Body);
            body = join == FilterJoin.Or ? Expression.OrElse(body, rebound) : Expression.AndAlso(body, rebound);
        }
        return Expression.Lambda<Func<DatasetRow, bool>>(body, parameter);
    }

    private sealed class ParameterRebinder(ParameterExpression from, ParameterExpression to) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node) =>
            node == from ? to : base.VisitParameter(node);
    }
}
