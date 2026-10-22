namespace Reporting.Abstractions;

/// <summary>Creates a dataset: its name plus the source system it draws from.</summary>
public class CreateDatasetDto
{
    public string Name { get; set; } = string.Empty;
    public int SourceId { get; set; }
}
