using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>Formatting for date/time columns.</summary>
public sealed class DateColumnConfig : DatasetColumnConfig
{
    [JsonIgnore] public override DatasetColumnConfigKind Kind => DatasetColumnConfigKind.Date;

    /// <summary>Date pattern, e.g. "dd/MM/yyyy". Empty falls back to the default pattern.</summary>
    public string? DateFormat { get; set; }
}
