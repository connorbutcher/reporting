using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

public sealed class BoolColumnConfig : DatasetColumnConfig
{
    [JsonIgnore] public override DatasetColumnConfigKind Kind => DatasetColumnConfigKind.Bool;

    /// <summary>Replace the default Yes/No.</summary>
    public string? TrueLabel { get; set; }
    public string? FalseLabel { get; set; }
}
