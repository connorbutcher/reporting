using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

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
