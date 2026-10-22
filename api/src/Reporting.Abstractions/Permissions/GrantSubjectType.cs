namespace Reporting.Abstractions;

/// <summary>Everyone means any authenticated user.</summary>
public enum GrantSubjectType
{
    User,
    Group,
    Everyone
}
