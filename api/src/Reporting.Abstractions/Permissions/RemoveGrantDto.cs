namespace Reporting.Abstractions;

public class RemoveGrantDto
{
    public GrantSubjectType SubjectType { get; set; }
    public Guid? SubjectId { get; set; }
}
