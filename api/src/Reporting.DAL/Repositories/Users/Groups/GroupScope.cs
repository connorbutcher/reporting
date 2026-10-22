namespace Reporting.DAL.Repositories;

/// <summary>A global admin manages every group; anyone else only the groups they hold a manager row for.</summary>
internal sealed record GroupScope(bool FullAdmin, HashSet<int> ManagedGroupIds)
{
    public bool ManagesAny
    {
        get
        {
            return FullAdmin || ManagedGroupIds.Count > 0;
        }
    }

    public bool Manages(int groupId)
    {
        return FullAdmin || ManagedGroupIds.Contains(groupId);
    }
}
