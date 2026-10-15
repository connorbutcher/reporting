namespace Reporting.Abstractions;

/// <summary>
/// The source system a dataset's data comes from. Each source has its own configuration
/// shape (see <see cref="DatasetSourceConfig"/>); the value doubles as the discriminator
/// for that polymorphic config.
/// </summary>
public enum DatasetSourceKey
{
    Assembly,
    Disassembly,
    Specification,

    /// <summary>Wraps another dataset in the same revision plus a saved filter — no data of its own.</summary>
    Filtered
}
