using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>A resolved pivot measure: its position, aggregate, override label, and the column it reduces (null for Count).</summary>
public sealed record PivotMeasurePlan(int Index, Aggregate Aggregate, string Label, DatasetColumn? Column);
