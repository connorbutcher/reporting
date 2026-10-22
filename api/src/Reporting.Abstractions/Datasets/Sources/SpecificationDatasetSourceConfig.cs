using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

public sealed class SpecificationDatasetSourceConfig : DatasetSourceConfig
{
    [JsonIgnore] public override DatasetSourceKey SourceKey => DatasetSourceKey.Specification;
}
