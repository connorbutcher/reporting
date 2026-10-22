namespace Reporting.Database;

/// <summary>A one-row limits dataset giving a chart its LSL/USL spec band.</summary>
internal sealed record SpecDataset(Dataset Dataset, Guid RowRef, DatasetColumn Lsl, DatasetColumn Usl);
