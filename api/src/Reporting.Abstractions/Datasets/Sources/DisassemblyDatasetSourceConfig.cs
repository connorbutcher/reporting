using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

public sealed class DisassemblyDatasetSourceConfig : PhasedDatasetSourceConfig
{
    [JsonIgnore] public override DatasetSourceKey SourceKey => DatasetSourceKey.Disassembly;
}
