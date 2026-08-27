using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>
/// The display-configuration shape a column formats through. Several
/// <see cref="DatasetColumnType"/>s share a shape (int and double both format as
/// <see cref="DatasetColumnConfigKind.Numeric"/>), so the config is keyed by this
/// kind rather than by the column type directly.
/// </summary>
public enum DatasetColumnConfigKind
{
    Numeric,
    Date,
    Bool,
    Text
}

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

/// <summary>Formatting for numeric columns (int and double).</summary>
public sealed class NumericColumnConfig : DatasetColumnConfig
{
    [JsonIgnore] public override DatasetColumnConfigKind Kind => DatasetColumnConfigKind.Numeric;

    /// <summary>Fixed number of decimal places; null formats up to 3, trimmed of trailing zeros.</summary>
    public int? Decimals { get; set; }

    /// <summary>Thousands separators, on by default.</summary>
    public bool? UseGrouping { get; set; }

    /// <summary>Text placed before/after the formatted number.</summary>
    public string Prefix { get; set; } = string.Empty;
    public string Suffix { get; set; } = string.Empty;
}

/// <summary>Formatting for date/time columns.</summary>
public sealed class DateColumnConfig : DatasetColumnConfig
{
    [JsonIgnore] public override DatasetColumnConfigKind Kind => DatasetColumnConfigKind.Date;

    /// <summary>Date pattern, e.g. "dd/MM/yyyy". Empty falls back to the default pattern.</summary>
    public string? DateFormat { get; set; }
}

/// <summary>Formatting for boolean columns.</summary>
public sealed class BoolColumnConfig : DatasetColumnConfig
{
    [JsonIgnore] public override DatasetColumnConfigKind Kind => DatasetColumnConfigKind.Bool;

    /// <summary>Labels used instead of Yes/No.</summary>
    public string? TrueLabel { get; set; }
    public string? FalseLabel { get; set; }
}

/// <summary>Text columns carry no formatting options yet.</summary>
public sealed class TextColumnConfig : DatasetColumnConfig
{
    [JsonIgnore] public override DatasetColumnConfigKind Kind => DatasetColumnConfigKind.Text;
}
