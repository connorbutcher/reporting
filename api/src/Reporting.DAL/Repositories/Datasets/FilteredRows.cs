using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>A dataset's rows after its mandatory filter (<see cref="All"/>) and after the caller's filter too.</summary>
internal sealed record FilteredRows(IQueryable<DatasetRow> All, IQueryable<DatasetRow> Matching);
