using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>
/// A dataset column's display configuration — one derived type per
/// <see cref="DatasetColumnConfigKind"/>. The concrete type is fixed by the owning
/// column's <see cref="DatasetColumnType"/>, and the blob is polymorphic on a "kind"
/// discriminator so a column's config can only ever be the shape its type formats
/// through. Feeds <c>CellFormatter</c> and round-trips to the UI as a discriminated union.
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "kind")]
[JsonDerivedType(typeof(NumericColumnConfig), typeDiscriminator: "numeric")]
[JsonDerivedType(typeof(DateColumnConfig), typeDiscriminator: "date")]
[JsonDerivedType(typeof(BoolColumnConfig), typeDiscriminator: "bool")]
[JsonDerivedType(typeof(TextColumnConfig), typeDiscriminator: "text")]
public abstract class DatasetColumnConfig
{
    /// <summary>
    /// The kind this configuration is. Ignored on the wire — the polymorphic "kind"
    /// discriminator already carries it — but used server-side to check a config matches
    /// the column it's being saved against. Named to avoid colliding with the "kind"
    /// discriminator, which System.Text.Json forbids even for an ignored property.
    /// </summary>
    [JsonIgnore]
    public abstract DatasetColumnConfigKind Kind { get; }

    /// <summary>The config kind a column of <paramref name="type"/> formats through.</summary>
    public static DatasetColumnConfigKind KindFor(DatasetColumnType type) => type switch
    {
        DatasetColumnType.Int or DatasetColumnType.Double => DatasetColumnConfigKind.Numeric,
        DatasetColumnType.DateTime => DatasetColumnConfigKind.Date,
        DatasetColumnType.Bool => DatasetColumnConfigKind.Bool,
        _ => DatasetColumnConfigKind.Text
    };
}
