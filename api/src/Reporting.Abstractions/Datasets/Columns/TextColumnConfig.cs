using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

public sealed class TextColumnConfig : DatasetColumnConfig
{
    [JsonIgnore] public override DatasetColumnConfigKind Kind => DatasetColumnConfigKind.Text;
}
