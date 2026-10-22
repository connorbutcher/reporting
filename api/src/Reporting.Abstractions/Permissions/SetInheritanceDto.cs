namespace Reporting.Abstractions;

/// <summary>Toggles whether an object inherits from its parent.</summary>
public class SetInheritanceDto
{
    public bool Inherits { get; set; }

    /// <summary>
    /// When breaking inheritance, first copy the currently-effective grants onto this object so
    /// no one (including the editor) loses access. Default true; pass false to start from a clean,
    /// potentially private, slate.
    /// </summary>
    public bool CopyDown { get; set; } = true;
}
