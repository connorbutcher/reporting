using Reporting.Abstractions;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.DAL.Filtering;

/// <summary>What translating a filter needs besides the filter: the dataset's columns, tolerance bounds, and the operator catalogue.</summary>
/// <param name="ToleranceByColumn">Resolved bounds per column RefId. Absent where there's no banding context, so a tolerance condition narrows nothing.</param>
/// <param name="OperatorCatalogue">The database-loaded catalogue for validating operators. Absent only with no database (a unit test), which falls back to the seed data.</param>
internal sealed record TranslationContext(
    IReadOnlyDictionary<Guid, DatasetColumn> ColumnsById,
    IReadOnlyDictionary<Guid, ToleranceBounds?>? ToleranceByColumn,
    IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>>? OperatorCatalogue)
{
    /// <exception cref="FilterException">The column isn't part of the dataset.</exception>
    public DatasetColumn Column(Guid columnId) =>
        ColumnsById.TryGetValue(columnId, out var column)
            ? column
            : throw new FilterException($"Column {columnId} is not part of this dataset.");
}
