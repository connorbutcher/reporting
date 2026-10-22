using System.Linq.Expressions;

namespace Reporting.DAL.Filtering;

/// <summary>Swaps one lambda parameter for another, so bodies from separate lambdas can share one.</summary>
internal sealed class ParameterRebinder(ParameterExpression from, ParameterExpression to) : ExpressionVisitor
{
    protected override Expression VisitParameter(ParameterExpression node)
    {
        return node == from ? to : base.VisitParameter(node);
    }
}
