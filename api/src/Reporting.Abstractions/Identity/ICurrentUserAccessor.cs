namespace Reporting.Abstractions;

/// <summary>Swapping this from the dev stub to a claims-backed one is all real authentication requires.</summary>
public interface ICurrentUserAccessor
{
    Task<ICurrentUser> GetAsync();
}
