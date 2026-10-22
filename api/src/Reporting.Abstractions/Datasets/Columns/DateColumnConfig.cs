using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

public sealed class DateColumnConfig : DatasetColumnConfig
{
    [JsonIgnore] public override DatasetColumnConfigKind Kind => DatasetColumnConfigKind.Date;

    /// <summary>e.g. "dd/MM/yyyy". Empty uses the default pattern.</summary>
    public string? DateFormat { get; set; }
}
