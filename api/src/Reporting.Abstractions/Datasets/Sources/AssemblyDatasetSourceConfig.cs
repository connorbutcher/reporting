using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

public sealed class AssemblyDatasetSourceConfig : PhasedDatasetSourceConfig
{
    [JsonIgnore] public override DatasetSourceKey SourceKey => DatasetSourceKey.Assembly;
}
