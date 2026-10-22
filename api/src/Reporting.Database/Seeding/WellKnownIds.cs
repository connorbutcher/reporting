namespace Reporting.Database;

/// <summary>Fixed reference ids for seeded rows the code needs to find by identity.</summary>
public static class WellKnownIds
{
    /// <summary>The stand-in user the app runs as until real authentication is wired up.</summary>
    public static readonly Guid DefaultUser = new("d0000000-0000-0000-0000-000000000001");
}
