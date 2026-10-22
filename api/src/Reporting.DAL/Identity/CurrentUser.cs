using Reporting.Abstractions;

namespace Reporting.DAL.Identity;

/// <summary>Plain immutable snapshot of the current user, built once per request.</summary>
public sealed record CurrentUser(
    int Id,
    Guid RefId,
    string DisplayName,
    string Email,
    bool IsGlobalAdmin,
    IReadOnlyCollection<int> GroupIds) : ICurrentUser;
