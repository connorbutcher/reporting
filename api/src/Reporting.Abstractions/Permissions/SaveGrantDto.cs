namespace Reporting.Abstractions;

/// <summary>Adds or updates a grant, keyed by its subject (one grant per subject per object).</summary>
public class SaveGrantDto
{
    public GrantSubjectType SubjectType { get; set; }
    public Guid? SubjectId { get; set; }
    public AccessLevel Level { get; set; }
}
