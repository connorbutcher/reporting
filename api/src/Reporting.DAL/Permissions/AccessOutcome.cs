namespace Reporting.DAL.Permissions;

/// <summary>How an authorization check came out, before it's turned into an HTTP status.</summary>
public enum AccessOutcome
{
    /// <summary>The caller may proceed.</summary>
    Allowed,

    /// <summary>The target doesn't exist, or is hidden from the caller — surfaces as 404 so nothing private leaks.</summary>
    NotFound,

    /// <summary>The caller can see the target but lacks the level the action needs — surfaces as 403.</summary>
    Forbidden,

    /// <summary>A mutation was aimed at a published version's immutable data — surfaces as 400.</summary>
    ReadOnly
}
