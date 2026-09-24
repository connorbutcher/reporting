using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Formulas.Planning;

/// <summary>Reads a stored cell as the typed value its column declares.</summary>
public static class FormulaCellReader
{
    /// <summary>A stored cell's value as the type its column declares; blank text and unparsable values are null.</summary>
    public static object? Read(DatasetCell? cell, DatasetColumnType type)
    {
        if (cell is null)
        {
            return null;
        }

        switch (type)
        {
            case DatasetColumnType.Int:
            case DatasetColumnType.Double:
                return cell.NumberValue;
            case DatasetColumnType.Bool:
                return cell.BoolValue;
            case DatasetColumnType.DateTime:
                return cell.DateValue;
            default:
                return string.IsNullOrWhiteSpace(cell.StringValue) ? null : cell.StringValue;
        }
    }
}
