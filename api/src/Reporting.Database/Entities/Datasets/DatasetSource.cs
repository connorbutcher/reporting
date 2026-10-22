using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>A fixed reference set seeded with stable ids (<see cref="DatasetSourceIds"/>).</summary>
public class DatasetSource
{
    public int Id { get; set; }

    /// <summary>Doubles as the discriminator for its config shape.</summary>
    public DatasetSourceKey Key { get; set; }

    public string Name { get; set; } = string.Empty;
}
