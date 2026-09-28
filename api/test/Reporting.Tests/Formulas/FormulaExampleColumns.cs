using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.Tests.Formulas;

/// <summary>The columns the catalogue's documentation examples refer to, so the examples can be checked as real formulas.</summary>
public static class FormulaExampleColumns
{
    private static readonly string[] TextNames =
    [
        "Region", "Email", "Name", "Part Number", "Serial", "First Name", "Last Name", "City", "Country",
        "Notes", "File", "Part", "Reading Text", "Inspected By"
    ];

    private static readonly string[] FlagNames = ["Passed", "Signed Off", "Late", "Damaged"];

    private static readonly string[] DateNames = ["Build Date", "Logged At", "Invoice Date", "Ordered", "Shipped"];

    private static readonly string[] NumberNames =
    [
        "Price", "Length", "Pallets", "Age", "Actual", "Target", "Variance", "Area", "Radius", "Count", "Value",
        "Reading 1", "Reading 2", "Reading 3", "Labour", "Materials", "Freight", "Score", "Scrap", "Produced", "Defects",
        "Inspected", "Last Month", "This Month", "Rating", "Id", "Year", "Month", "Diameter", "Override", "Default", "Rate"
    ];

    public static List<DatasetColumn> Build()
    {
        var columns = new List<DatasetColumn>();
        AddAll(columns, TextNames, DatasetColumnType.String);
        AddAll(columns, FlagNames, DatasetColumnType.Bool);
        AddAll(columns, DateNames, DatasetColumnType.DateTime);
        AddAll(columns, NumberNames, DatasetColumnType.Double);
        return columns;
    }

    private static void AddAll(List<DatasetColumn> columns, string[] names, DatasetColumnType type)
    {
        foreach (var name in names)
        {
            columns.Add(new DatasetColumn { Name = name, Type = type });
        }
    }
}
