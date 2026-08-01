using System.Text.Json;

namespace Reporting.Api.Domain;

public class DatasetRow
{
    public Guid Id { get; set; }
    public Guid DatasetId { get; set; }
    public Dataset? Dataset { get; set; }

    // JSON object mapping DatasetColumn.Id to that cell's value, stored as a string.
    public string ValuesJson { get; set; } = "{}";

    public Dictionary<Guid, string> GetValues() =>
        JsonSerializer.Deserialize<Dictionary<Guid, string>>(ValuesJson) ?? new();

    public void SetValues(Dictionary<Guid, string> values) =>
        ValuesJson = JsonSerializer.Serialize(values);
}
