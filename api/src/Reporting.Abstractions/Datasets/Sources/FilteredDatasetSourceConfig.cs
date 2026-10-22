using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>
/// Configuration for a filtered dataset: the dataset (in the same revision) it draws rows from, and
/// the filter every reader sees applied — AND-ed with whatever filter the reader supplies on top.
/// Carries no columns or rows of its own; <see cref="BaseDatasetId"/> is resolved by
/// <see cref="Reporting.DAL.Repositories.DatasetResolver"/>.
/// </summary>
public sealed class FilteredDatasetSourceConfig : DatasetSourceConfig
{
    [JsonIgnore] public override DatasetSourceKey SourceKey => DatasetSourceKey.Filtered;

    /// <summary>The dataset this one filters. Zero until chosen.</summary>
    public int BaseDatasetId { get; set; }

    /// <summary>The saved filter, referencing the base dataset's column RefIds. Null (or empty) filters nothing.</summary>
    public FilterGroupDto? Filter { get; set; }
}
