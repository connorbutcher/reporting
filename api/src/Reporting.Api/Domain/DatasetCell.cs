namespace Reporting.Api.Domain;

/// <summary>
/// One cell of a dataset row, stored with a column per data type so filters can
/// be expressed as ordinary LINQ over indexed values rather than string surgery
/// over a JSON blob. Only the field matching the column's type is populated;
/// <see cref="StringValue"/> always holds the canonical text form.
/// </summary>
public class DatasetCell
{
    public Guid Id { get; set; }
    public Guid RowId { get; set; }
    public DatasetRow? Row { get; set; }
    public Guid ColumnId { get; set; }

    /// <summary>The raw text as entered; also what string operators match against.</summary>
    public string? StringValue { get; set; }

    /// <summary>Set for Int and Double columns.</summary>
    public double? NumberValue { get; set; }

    /// <summary>Set for Bool columns.</summary>
    public bool? BoolValue { get; set; }

    /// <summary>Set for DateTime columns.</summary>
    public DateTime? DateValue { get; set; }
}
