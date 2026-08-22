using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// A source system datasets can draw from (assembly, disassembly, specification). A fixed
/// reference set seeded with stable ids so datasets can carry a required FK to it and the
/// code can address a source by identity.
/// </summary>
public class DatasetSource
{
    public int Id { get; set; }

    /// <summary>The source's stable key; doubles as the discriminator for its config shape.</summary>
    public DatasetSourceKey Key { get; set; }

    /// <summary>Human-readable name shown in the source pickers.</summary>
    public string Name { get; set; } = string.Empty;
}

/// <summary>Stable ids for the seeded <see cref="DatasetSource"/> rows.</summary>
public static class DatasetSourceIds
{
    public const int Assembly = 1;
    public const int Disassembly = 2;
    public const int Specification = 3;
}
