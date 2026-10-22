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
