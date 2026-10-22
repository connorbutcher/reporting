using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>Specification-sourced datasets carry no extra source configuration yet.</summary>
public sealed class SpecificationDatasetSourceConfig : DatasetSourceConfig
{
    [JsonIgnore] public override DatasetSourceKey SourceKey => DatasetSourceKey.Specification;
}
