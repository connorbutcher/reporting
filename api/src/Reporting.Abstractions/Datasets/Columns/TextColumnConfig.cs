using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>Text columns carry no formatting options yet.</summary>
public sealed class TextColumnConfig : DatasetColumnConfig
{
    [JsonIgnore] public override DatasetColumnConfigKind Kind => DatasetColumnConfigKind.Text;
}
