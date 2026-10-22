using System.Text.Json;

namespace Reporting.DAL.Repositories;

/// <summary>Reads a revision's page-level filters, stored per dataset as [{ datasetId, filter }].</summary>
internal static class ReportFilterJson
{
    /// <summary>The raw JSON of each filter that applies to <paramref name="datasetId"/>.</summary>
    public static IEnumerable<string> For(string? filtersJson, int datasetId)
    {
        if (string.IsNullOrWhiteSpace(filtersJson))
        {
            yield break;
        }

        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(filtersJson);
        }
        catch (JsonException)
        {
            yield break;
        }

        using (document)
        {
            if (document.RootElement.ValueKind != JsonValueKind.Array)
            {
                yield break;
            }

            foreach (var entry in document.RootElement.EnumerateArray())
            {
                if (FilterFor(entry, datasetId) is { } filter)
                {
                    yield return filter;
                }
            }
        }
    }

    private static string? FilterFor(JsonElement entry, int datasetId)
    {
        if (entry.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var forThisDataset = false;
        string? filter = null;
        foreach (var property in entry.EnumerateObject())
        {
            if (string.Equals(property.Name, "datasetId", StringComparison.OrdinalIgnoreCase)
                && property.Value.ValueKind == JsonValueKind.Number
                && property.Value.TryGetInt32(out var id))
            {
                forThisDataset = id == datasetId;
            }
            else if (string.Equals(property.Name, "filter", StringComparison.OrdinalIgnoreCase))
            {
                filter = property.Value.GetRawText();
            }
        }
        return forThisDataset ? filter : null;
    }
}
