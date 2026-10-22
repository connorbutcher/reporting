namespace Reporting.Abstractions;

public class FilterGroupDto : FilterNodeDto
{
    public FilterJoin Join { get; set; } = FilterJoin.And;
    public List<FilterNodeDto> Children { get; set; } = new();
}
