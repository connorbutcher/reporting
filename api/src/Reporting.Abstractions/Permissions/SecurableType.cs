namespace Reporting.Abstractions;

/// <summary>The kind of object a grant is attached to. Root is the singleton scope every top-level item inherits from.</summary>
public enum SecurableType
{
    Folder,
    Report,
    Root
}
