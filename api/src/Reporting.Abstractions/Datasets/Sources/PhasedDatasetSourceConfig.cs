namespace Reporting.Abstractions;

/// <summary>
/// Shared configuration for the build-oriented sources (assembly and disassembly): the
/// source-system type being reported on, and which of its phases to include.
/// </summary>
public abstract class PhasedDatasetSourceConfig : DatasetSourceConfig
{
    /// <summary>The source-system type id this dataset draws from. Null until chosen.</summary>
    public int? TypeId { get; set; }

    /// <summary>The phases of that type to include, by source-system phase id.</summary>
    public List<int> PhaseIds { get; set; } = new();
}
