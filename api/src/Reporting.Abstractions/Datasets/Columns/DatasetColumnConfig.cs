using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>A column's display configuration, one derived type per <see cref="DatasetColumnConfigKind"/>.</summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "kind")]
[JsonDerivedType(typeof(NumericColumnConfig), typeDiscriminator: "numeric")]
[JsonDerivedType(typeof(DateColumnConfig), typeDiscriminator: "date")]
[JsonDerivedType(typeof(BoolColumnConfig), typeDiscriminator: "bool")]
[JsonDerivedType(typeof(TextColumnConfig), typeDiscriminator: "text")]
public abstract class DatasetColumnConfig
{
    /// <summary>Server-side only; the "kind" discriminator carries it on the wire.</summary>
    [JsonIgnore]
    public abstract DatasetColumnConfigKind Kind { get; }

    public static DatasetColumnConfigKind KindFor(DatasetColumnType type)
    {
        return type switch
        {
            DatasetColumnType.Int or DatasetColumnType.Double => DatasetColumnConfigKind.Numeric,
            DatasetColumnType.DateTime => DatasetColumnConfigKind.Date,
            DatasetColumnType.Bool => DatasetColumnConfigKind.Bool,
            _ => DatasetColumnConfigKind.Text
        };
    }
}
