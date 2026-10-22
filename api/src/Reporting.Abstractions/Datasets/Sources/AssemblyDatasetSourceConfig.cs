using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>Configuration for an assembly-sourced dataset.</summary>
public sealed class AssemblyDatasetSourceConfig : PhasedDatasetSourceConfig
{
    [JsonIgnore] public override DatasetSourceKey SourceKey => DatasetSourceKey.Assembly;
}
