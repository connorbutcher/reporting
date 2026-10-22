using System.Text.Json;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL;

public static class ColumnMapping
{
    public static DatasetColumnDto ToDto(this DatasetColumn column)
    {
        return new()
        {
            Id = column.RefId,
            Name = column.Name,
            Type = column.Type,
            Order = column.Order,
            Formula = column.FormulaExpression,
            FormulaError = column.FormulaError,
            Configuration = column.GetConfig()
        };
    }

    /// <summary>
    /// Read by column type rather than the blob's own "kind" discriminator, so configs stored before
    /// typing existed still load. A blank or malformed blob falls back to the type's default.
    /// </summary>
    public static DatasetColumnConfig GetConfig(this DatasetColumn column)
    {
        if (!string.IsNullOrWhiteSpace(column.ConfigurationJson))
        {
            try
            {
                if (JsonSerializer.Deserialize(
                        column.ConfigurationJson,
                        DatasetColumnConfigs.ConcreteType(column.Type),
                        ConfigJson.Options) is DatasetColumnConfig config)
                {
                    return config;
                }
            }
            catch (JsonException)
            {
            }
        }

        return DatasetColumnConfigs.Default(column.Type);
    }

    public static void SetConfig(this DatasetColumn column, DatasetColumnConfig config)
    {
        column.ConfigurationJson = JsonSerializer.Serialize(config, typeof(DatasetColumnConfig), ConfigJson.Options);
    }
}
