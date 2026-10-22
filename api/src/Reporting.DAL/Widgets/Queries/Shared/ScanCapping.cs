namespace Reporting.DAL.Widgets;

/// <summary>Settles a capped, in-memory scan against its row cap.</summary>
public static class ScanCapping
{
    /// <summary>
    /// Ceiling on rows a widget pulls into memory when its reduction needs every value (quartiles,
    /// bins, tolerance classification, pivot medians). Sized for datasets of up to a million rows, so
    /// they reduce in full; past it a runaway dataset is still capped and the response says so.
    /// Reductions SQL can do itself (counts, sums, averages, minimums, maximums) aren't capped at all.
    /// </summary>
    public const int MaxScanRows = 1_000_000;

    /// <summary>
    /// Settles a capped scan that was fetched one row past its cap: the extra row only proves the cap
    /// was hit, so it is dropped from <paramref name="fetched"/> and the scan reported as truncated.
    /// Fetching the extra row makes that flag exact rather than a guess from the matched count.
    /// </summary>
    public static bool TrimToScanCap<T>(List<T> fetched, int cap)
    {
        if (fetched.Count <= cap)
        {
            return false;
        }
        fetched.RemoveRange(cap, fetched.Count - cap);
        return true;
    }
}
