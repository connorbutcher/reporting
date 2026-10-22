namespace Reporting.Database;

/// <summary>A cell created once its column has a database id.</summary>
internal sealed record PendingCell(DatasetRow Row, DatasetColumn Column, string Raw);
