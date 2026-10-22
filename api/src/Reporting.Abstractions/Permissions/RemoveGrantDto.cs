namespace Reporting.Abstractions;

/// <summary>Removes the grant for a subject, if present.</summary>
public class RemoveGrantDto
{
    public GrantSubjectType SubjectType { get; set; }
    public Guid? SubjectId { get; set; }
}
