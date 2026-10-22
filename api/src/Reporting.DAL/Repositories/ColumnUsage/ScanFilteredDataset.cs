namespace Reporting.DAL.Repositories;

/// <summary>A filtered dataset built directly on the scanned one, and the raw JSON of its saved filter.</summary>
internal sealed record ScanFilteredDataset(string Name, string FilterJson);
