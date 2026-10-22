using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>A tolerance band resolved once per query, since it doesn't vary across periods or groups.</summary>
internal sealed record KpiToleranceContext(
    DatasetColumn ValueColumn, DatasetColumn? MatchColumn, ToleranceBounds? FixedBounds, MatchedLimits? MatchedLimits);
