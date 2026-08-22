using Reporting.Abstractions;

namespace Reporting.DAL;

/// <summary>Factory for the default (empty) source configuration of each dataset source.</summary>
public static class DatasetSourceConfigs
{
    /// <summary>The blank configuration a dataset gets when first pointed at <paramref name="key"/>.</summary>
    public static DatasetSourceConfig Default(DatasetSourceKey key) => key switch
    {
        DatasetSourceKey.Assembly => new AssemblyDatasetSourceConfig(),
        DatasetSourceKey.Disassembly => new DisassemblyDatasetSourceConfig(),
        DatasetSourceKey.Specification => new SpecificationDatasetSourceConfig(),
        _ => throw new ArgumentOutOfRangeException(nameof(key), key, "Unknown dataset source.")
    };
}
