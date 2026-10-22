namespace Reporting.Abstractions;

public abstract class PhasedDatasetSourceConfig : DatasetSourceConfig
{
    /// <summary>Source-system type id; null until chosen.</summary>
    public int? TypeId { get; set; }

    public List<int> PhaseIds { get; set; } = new();
}
