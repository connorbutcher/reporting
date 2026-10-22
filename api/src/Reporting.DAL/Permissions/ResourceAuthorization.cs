using Reporting.Abstractions;

namespace Reporting.DAL.Permissions;

/// <summary>An authorization decision: the outcome plus the caller's resolved level on the target.</summary>
public sealed record ResourceAuthorization(AccessOutcome Outcome, AccessLevel Level)
{
    public bool Allowed => Outcome == AccessOutcome.Allowed;

    public static ResourceAuthorization NotFound { get; } = new(AccessOutcome.NotFound, AccessLevel.None);
}
