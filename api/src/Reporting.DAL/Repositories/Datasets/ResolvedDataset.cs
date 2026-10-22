using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// The dataset a requested id resolves to: <paramref name="Physical"/> is the dataset whose rows
/// and cells actually exist (what every row/cell query runs against and whose columns are the
/// schema), while <paramref name="Id"/>/<paramref name="Name"/> identify the dataset as requested —
/// the two differ when the request named a filtered dataset. <paramref name="MandatoryFilter"/> is
/// every level of filtering a chain of filtered datasets bakes in, AND-ed together; null means none.
/// </summary>
public sealed record ResolvedDataset(int Id, string Name, Dataset Physical, FilterGroupDto? MandatoryFilter);
