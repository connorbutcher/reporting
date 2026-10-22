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
[JsonDerivedType(typeof(FilteredDatasetSourceConfig), typeDiscriminator: "filtered")]
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
