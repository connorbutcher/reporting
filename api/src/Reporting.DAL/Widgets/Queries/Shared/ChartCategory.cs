namespace Reporting.DAL.Widgets;

/// <summary>
/// One category of a grouping chart, keyed by its typed value rather than its raw text, so
/// <c>5</c> and <c>5.0</c> (or a date written two ways) are one category, not two. <see cref="Key"/>
/// is "" for the blank category and <see cref="OtherKey"/> for a Top N's "Other".
/// </summary>
public readonly record struct ChartCategory(string Key, double? Number, DateTime? Date, DateTime? PeriodEnd)
{
    /// <summary>The key of the "Other" category a Top N sort rolls the rest into — never a real key, which are trimmed text or invariant numbers/dates.</summary>
    public const string OtherKey = "\u0001other";

    public bool IsBlank => Key.Length == 0;
    public bool IsOther => Key == OtherKey;

    public static readonly ChartCategory Blank = new("", null, null, null);
    public static readonly ChartCategory Other = new(OtherKey, null, null, null);
}
