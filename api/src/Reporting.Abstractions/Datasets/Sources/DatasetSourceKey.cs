namespace Reporting.Abstractions;

public enum DatasetSourceKey
{
    Assembly,
    Disassembly,
    Specification,

    /// <summary>Another dataset in the same revision plus a saved filter; no data of its own.</summary>
    Filtered
}
