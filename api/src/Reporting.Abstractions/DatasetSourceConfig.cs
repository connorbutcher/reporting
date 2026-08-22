using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>
/// The source-system-specific configuration a dataset carries — one derived type per
/// <see cref="DatasetSourceKey"/>. The concrete type is fixed by the owning dataset's
/// source, and the stored blob is polymorphic on a "source" discriminator whose value
/// matches the source key, so a dataset's config can only ever be the shape its source
/// defines.
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "source")]
[JsonDerivedType(typeof(AssemblyDatasetSourceConfig), typeDiscriminator: "assembly")]
[JsonDerivedType(typeof(DisassemblyDatasetSourceConfig), typeDiscriminator: "disassembly")]
[JsonDerivedType(typeof(SpecificationDatasetSourceConfig), typeDiscriminator: "specification")]
public abstract class DatasetSourceConfig
{
    /// <summary>
    /// The source this configuration belongs to. Ignored on the wire — the polymorphic
    /// "source" discriminator already carries it — but used server-side to check a config
    /// matches the dataset it's being saved against. Named to avoid colliding with the
    /// "source" discriminator, which System.Text.Json forbids even for an ignored property.
    /// </summary>
    [JsonIgnore]
    public abstract DatasetSourceKey SourceKey { get; }
}

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

/// <summary>Configuration for an assembly-sourced dataset.</summary>
public sealed class AssemblyDatasetSourceConfig : PhasedDatasetSourceConfig
{
    [JsonIgnore] public override DatasetSourceKey SourceKey => DatasetSourceKey.Assembly;
}

/// <summary>Configuration for a disassembly-sourced dataset.</summary>
public sealed class DisassemblyDatasetSourceConfig : PhasedDatasetSourceConfig
{
    [JsonIgnore] public override DatasetSourceKey SourceKey => DatasetSourceKey.Disassembly;
}

/// <summary>Specification-sourced datasets carry no extra source configuration yet.</summary>
public sealed class SpecificationDatasetSourceConfig : DatasetSourceConfig
{
    [JsonIgnore] public override DatasetSourceKey SourceKey => DatasetSourceKey.Specification;
}
