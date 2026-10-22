namespace Reporting.Abstractions;

/// <summary>Repoints a dataset at a different source; its configuration resets to that source's default.</summary>
public class SetDatasetSourceDto
{
    public int SourceId { get; set; }
}
