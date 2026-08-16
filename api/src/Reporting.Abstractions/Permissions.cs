namespace Reporting.Abstractions;

/// <summary>
/// What a subject can do with a securable, as an ordered ladder: a higher level
/// includes everything below it, so combining grants (a user's own plus their
/// groups', across an object and its inherited ancestors) is a simple max.
/// </summary>
public enum AccessLevel
{
    None = 0,
    Viewer = 1,
    Editor = 2,
    Manager = 3
}

/// <summary>The kind of object a grant is attached to. Root is the singleton scope every top-level item inherits from.</summary>
public enum SecurableType
{
    Folder,
    Report,
    Root
}

/// <summary>Who a grant is for. Everyone means any authenticated user — the baseline that makes the root open.</summary>
public enum GrantSubjectType
{
    User,
    Group,
    Everyone
}
