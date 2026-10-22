namespace Reporting.Abstractions;

/// <summary>An ordered ladder, so combining grants is a simple max.</summary>
public enum AccessLevel
{
    None = 0,
    Viewer = 1,
    Editor = 2,
    Manager = 3
}
