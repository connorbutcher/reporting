using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>A resolved pivot measure: its request position, aggregate, how it's shown, override label, and the column it reduces (null for Count).</summary>
public sealed record PivotMeasurePlan(int Index, PivotAggregate Aggregate, PivotShowAs ShowAs, string Label, DatasetColumn? Column);
