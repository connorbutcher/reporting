using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>Rows of a base dataset with a saved filter AND-ed onto every read.</summary>
public sealed class FilteredDatasetSourceConfig : DatasetSourceConfig
{
    [JsonIgnore] public override DatasetSourceKey SourceKey => DatasetSourceKey.Filtered;

    /// <summary>Zero until chosen.</summary>
    public int BaseDatasetId { get; set; }

    /// <summary>References the base dataset's column RefIds. Null or empty filters nothing.</summary>
    public FilterGroupDto? Filter { get; set; }
}
