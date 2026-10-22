namespace Reporting.Abstractions;

/// <summary>Who a grant is for. Everyone means any authenticated user — the baseline that makes the root open.</summary>
public enum GrantSubjectType
{
    User,
    Group,
    Everyone
}
