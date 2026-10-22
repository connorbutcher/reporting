namespace Reporting.Database;

/// <summary>A column per data type so filters are indexed LINQ. Only the type's field is set; StringValue always is.</summary>
public class DatasetCell
{
    public int Id { get; set; }
    public int RowId { get; set; }
    public DatasetRow? Row { get; set; }

    /// <summary>No FK to the column: cells are only cascaded via their row.</summary>
    public int ColumnId { get; set; }

    /// <summary>The raw text; also what string operators match.</summary>
    public string? StringValue { get; set; }

    public double? NumberValue { get; set; }

    public bool? BoolValue { get; set; }

    public DateTime? DateValue { get; set; }
}
