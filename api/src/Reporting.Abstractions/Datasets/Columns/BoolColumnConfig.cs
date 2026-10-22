using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>Formatting for boolean columns.</summary>
public sealed class BoolColumnConfig : DatasetColumnConfig
{
    [JsonIgnore] public override DatasetColumnConfigKind Kind => DatasetColumnConfigKind.Bool;

    /// <summary>Labels used instead of Yes/No.</summary>
    public string? TrueLabel { get; set; }
    public string? FalseLabel { get; set; }
}
