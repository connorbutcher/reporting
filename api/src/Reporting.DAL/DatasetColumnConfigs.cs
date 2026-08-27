using Reporting.Abstractions;

namespace Reporting.DAL;

/// <summary>Factory and type resolution for a column's typed display configuration.</summary>
public static class DatasetColumnConfigs
{
    /// <summary>The blank configuration a column of <paramref name="type"/> gets by default.</summary>
    public static DatasetColumnConfig Default(DatasetColumnType type) =>
        DatasetColumnConfig.KindFor(type) switch
        {
            DatasetColumnConfigKind.Numeric => new NumericColumnConfig(),
            DatasetColumnConfigKind.Date => new DateColumnConfig(),
            DatasetColumnConfigKind.Bool => new BoolColumnConfig(),
            _ => new TextColumnConfig()
        };

    /// <summary>The concrete config type a column of <paramref name="type"/> deserializes into.</summary>
    public static Type ConcreteType(DatasetColumnType type) =>
        DatasetColumnConfig.KindFor(type) switch
        {
            DatasetColumnConfigKind.Numeric => typeof(NumericColumnConfig),
            DatasetColumnConfigKind.Date => typeof(DateColumnConfig),
            DatasetColumnConfigKind.Bool => typeof(BoolColumnConfig),
            _ => typeof(TextColumnConfig)
        };
}
