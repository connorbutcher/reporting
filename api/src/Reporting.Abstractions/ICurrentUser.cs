namespace Reporting.Abstractions;

/// <summary>
/// The identity permission checks resolve against. Everything here comes either from
/// the seeded default user (today) or from the authenticated principal's claims (once
/// real auth lands) — the shape is the same so nothing downstream changes.
/// </summary>
public interface ICurrentUser
{
    int Id { get; }
    Guid RefId { get; }
    string DisplayName { get; }

    /// <summary>Bypasses the ACL — treated as Manager on every securable.</summary>
    bool IsGlobalAdmin { get; }

    /// <summary>The database ids of every group the user belongs to, for matching group grants.</summary>
    IReadOnlyCollection<int> GroupIds { get; }
}

/// <summary>
/// Resolves the current request's user. Swapping the registered implementation — from the
/// dev stub to a claims-backed one — is the single change real authentication requires.
/// </summary>
public interface ICurrentUserAccessor
{
    Task<ICurrentUser> GetAsync();
}
