namespace Reporting.Abstractions;

/// <summary>One grant per subject per object.</summary>
public class SaveGrantDto
{
    public GrantSubjectType SubjectType { get; set; }
    public Guid? SubjectId { get; set; }
    public AccessLevel Level { get; set; }
}
