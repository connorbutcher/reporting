namespace Reporting.Abstractions;

public class DatasetQueryDto
{
    /// <summary>Null or an empty group means "no filtering".</summary>
    public FilterGroupDto? Filter { get; set; }
}
