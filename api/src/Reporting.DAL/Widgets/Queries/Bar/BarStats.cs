using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

/// <summary>A mergeable reduction of one bar's rows: enough to produce any <see cref="Aggregate"/> after merging.</summary>
public readonly record struct BarStats(int Count, double? Sum, double? Min, double? Max)
{
    public static BarStats From(BarGroup group) => new(group.Count, group.Sum, group.Min, group.Max);

    public BarStats Merge(BarStats other) => new(
        Count + other.Count,
        Add(Sum, other.Sum),
        Pick(Min, other.Min, Math.Min),
        Pick(Max, other.Max, Math.Max));

    /// <summary>
    /// The bar's height for <paramref name="aggregate"/>. Average divides by the row count, which for
    /// every aggregate but Count is the count of rows carrying a measure (the caller filtered the rest out).
    /// </summary>
    public double? Value(Aggregate aggregate) => aggregate switch
    {
        Aggregate.Count => Count,
        Aggregate.Sum => Sum,
        Aggregate.Average => Count > 0 && Sum is { } sum ? sum / Count : null,
        Aggregate.Min => Min,
        Aggregate.Max => Max,
        _ => null
    };

    private static double? Add(double? a, double? b) => a is null ? b : b is null ? a : a + b;

    private static double? Pick(double? a, double? b, Func<double, double, double> choose) =>
        a is null ? b : b is null ? a : choose(a.Value, b.Value);
}
