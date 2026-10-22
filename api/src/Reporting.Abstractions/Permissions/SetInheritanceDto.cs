namespace Reporting.Abstractions;

public class SetInheritanceDto
{
    public bool Inherits { get; set; }

    /// <summary>When breaking inheritance, first copy the effective grants down so no one loses access.</summary>
    public bool CopyDown { get; set; } = true;
}
