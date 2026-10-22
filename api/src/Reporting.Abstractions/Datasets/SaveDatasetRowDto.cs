namespace Reporting.Abstractions;

public class SaveDatasetRowDto
{
    /// <summary>Keyed by column id; unknown columns are ignored.</summary>
    public Dictionary<Guid, string> Values { get; set; } = new();
}
