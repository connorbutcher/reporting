using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>One operator offerable on one column type: its label and operands. A seeded reference set, read from the database so the client's catalogue and the server's validation can't disagree.</summary>
public class FilterOperatorDefinition
{
    public int Id { get; set; }

    public DatasetColumnType ColumnType { get; set; }
    public FilterOperator Operator { get; set; }

    public string Label { get; set; } = string.Empty;
    public int OperandCount { get; set; }
    public FilterOperandKind OperandKind { get; set; }

    /// <summary>Display order within this column type's operator list.</summary>
    public int SortOrder { get; set; }
}
