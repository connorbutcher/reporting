using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>Configuration for a disassembly-sourced dataset.</summary>
public sealed class DisassemblyDatasetSourceConfig : PhasedDatasetSourceConfig
{
    [JsonIgnore] public override DatasetSourceKey SourceKey => DatasetSourceKey.Disassembly;
}
