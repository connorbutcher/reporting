using Reporting.Abstractions;

namespace Reporting.Tests;

public sealed record TestUser(int Id, bool IsGlobalAdmin = false, int[]? Groups = null) : ICurrentUser
{
    public Guid RefId
    {
        get
        {
            return Guid.Empty;
        }
    }

    public string DisplayName
    {
        get
        {
            return "test";
        }
    }

    public string Email
    {
        get
        {
            return "test@local";
        }
    }

    public IReadOnlyCollection<int> GroupIds
    {
        get
        {
            return Groups ?? [];
        }
    }
}
