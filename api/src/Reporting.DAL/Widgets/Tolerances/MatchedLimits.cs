using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// The limits rows of a limits dataset, indexed by their match identifier, for tolerance that picks
/// a data row's limits by value rather than pointing at one fixed row.
/// </summary>
public sealed class MatchedLimits(IReadOnlyDictionary<string, ToleranceBounds> byKey)
{
    public static readonly MatchedLimits Empty = new(new Dictionary<string, ToleranceBounds>());

    /// <summary>The limits for a data row, from its cell in the match column; null when it has no identifier or no limits row matches.</summary>
    public ToleranceBounds? For(DatasetCell? keyCell)
    {
        if (keyCell is null)
        {
            return null;
        }

        var key = ToleranceResolver.MatchKey(keyCell.StringValue, keyCell.NumberValue, keyCell.DateValue);
        return key is not null && byKey.TryGetValue(key, out var bounds) ? bounds : null;
    }
}
