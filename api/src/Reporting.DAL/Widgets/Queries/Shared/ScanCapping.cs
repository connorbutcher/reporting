namespace Reporting.DAL.Widgets;

/// <summary>Settles a capped, in-memory scan against its row cap.</summary>
public static class ScanCapping
{
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
