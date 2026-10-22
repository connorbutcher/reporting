namespace Reporting.Abstractions;

public interface ICurrentUser
{
    int Id { get; }
    Guid RefId { get; }
    string DisplayName { get; }
    string Email { get; }

    /// <summary>Bypasses the ACL — treated as Manager on every securable.</summary>
    bool IsGlobalAdmin { get; }

    IReadOnlyCollection<int> GroupIds { get; }
}
