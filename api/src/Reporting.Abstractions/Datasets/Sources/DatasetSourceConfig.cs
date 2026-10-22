using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>A dataset's source-specific configuration, one derived type per <see cref="DatasetSourceKey"/>.</summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "source")]
[JsonDerivedType(typeof(AssemblyDatasetSourceConfig), typeDiscriminator: "assembly")]
[JsonDerivedType(typeof(DisassemblyDatasetSourceConfig), typeDiscriminator: "disassembly")]
[JsonDerivedType(typeof(SpecificationDatasetSourceConfig), typeDiscriminator: "specification")]
[JsonDerivedType(typeof(FilteredDatasetSourceConfig), typeDiscriminator: "filtered")]
public abstract class DatasetSourceConfig
{
    /// <summary>Server-side only; the "source" discriminator carries it on the wire.</summary>
    [JsonIgnore]
    public abstract DatasetSourceKey SourceKey { get; }
}
