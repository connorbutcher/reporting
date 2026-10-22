using System.Text.Json;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL;

public static class DatasetMapping
{
    public static DatasetSourceDto ToDto(this DatasetSource source)
    {
        return new()
        {
            Id = source.Id,
            Key = source.Key,
            Name = source.Name
        };
    }

    /// <summary>Assumes <see cref="Dataset.Source"/> is loaded.</summary>
    public static DatasetSummaryDto ToSummaryDto(this Dataset dataset)
    {
        return new()
        {
            Id = dataset.Id,
            Name = dataset.Name,
            Source = dataset.Source!.Key
        };
    }

    /// <summary>
    /// Assumes <see cref="Dataset.Source"/> and <see cref="Dataset.Columns"/> are loaded.
    /// <paramref name="columnsOverride"/> shows different columns than the dataset's own — for a
    /// filtered dataset, whose schema is inherited from whatever it resolves to.
    /// </summary>
    public static DatasetSchemaDto ToSchemaDto(this Dataset dataset, IEnumerable<DatasetColumn>? columnsOverride = null)
    {
        return new()
        {
            Id = dataset.Id,
            Name = dataset.Name,
            SourceId = dataset.DatasetSourceId,
            Source = dataset.Source!.Key,
            SourceConfig = dataset.GetSourceConfig(),
            Columns = (columnsOverride ?? dataset.Columns).OrderBy(c => c.Order).Select(c => c.ToDto()).ToList()
        };
    }

    /// <summary>
    /// The dataset's source configuration, deserialized from its blob. A blank blob (a freshly
    /// created or backfilled dataset) or one that doesn't match the current source falls back to
    /// that source's default config — assumes <see cref="Dataset.Source"/> is loaded.
    /// </summary>
    public static DatasetSourceConfig GetSourceConfig(this Dataset dataset)
    {
        if (!string.IsNullOrWhiteSpace(dataset.SourceConfigJson))
        {
            try
            {
                var config = JsonSerializer.Deserialize<DatasetSourceConfig>(dataset.SourceConfigJson, ConfigJson.Options);
                if (config is not null && config.SourceKey == dataset.Source!.Key)
                {
                    return config;
                }
            }
            catch (Exception ex) when (ex is JsonException or NotSupportedException)
            {
                // "{}" has no discriminator (NotSupportedException); either way fall back to the default.
            }
        }

        return DatasetSourceConfigs.Default(dataset.Source!.Key);
    }

    public static void SetSourceConfig(this Dataset dataset, DatasetSourceConfig config)
    {
        dataset.SourceConfigJson = JsonSerializer.Serialize(config, typeof(DatasetSourceConfig), ConfigJson.Options);
    }

    /// <summary>Without needing <see cref="Dataset.Source"/> loaded, for a revision copy. Null for a blank or malformed blob.</summary>
    public static DatasetSourceConfig? TryGetSourceConfig(string sourceConfigJson)
    {
        try
        {
            return JsonSerializer.Deserialize<DatasetSourceConfig>(sourceConfigJson, ConfigJson.Options);
        }
        catch (Exception ex) when (ex is JsonException or NotSupportedException)
        {
            return null;
        }
    }
}
