namespace Reporting.Abstractions;

public class DatasetRowDto
{
    public Guid Id { get; set; }

    /// <summary>Keyed by column id; values are always strings.</summary>
    public Dictionary<Guid, string> Values { get; set; } = new();
}
