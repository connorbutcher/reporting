using Reporting.Database;

namespace Reporting.DAL.Filtering;

/// <summary>Parses a condition's raw string operands against the column's type, for translators that need typed values.</summary>
internal static class FilterValueParsing
{
    public static double ParseNumber(string? raw, DatasetColumn column) =>
        CellValues.TryParseNumber(raw, out var value)
            ? value
            : throw new FilterException($"'{raw}' is not a number, which '{column.Name}' needs.");

    public static DateTime ParseDate(string? raw, DatasetColumn column) =>
        CellValues.TryParseDate(raw, out var value)
            ? value
            : throw new FilterException($"'{raw}' is not a date, which '{column.Name}' needs.");
}
