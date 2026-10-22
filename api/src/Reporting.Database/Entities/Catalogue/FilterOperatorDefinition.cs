using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>One operator offered on one column type. Seeded, so the client catalogue and server validation agree.</summary>
public class FilterOperatorDefinition
{
    public int Id { get; set; }

    public DatasetColumnType ColumnType { get; set; }
    public FilterOperator Operator { get; set; }

    public string Label { get; set; } = string.Empty;
    public int OperandCount { get; set; }
    public FilterOperandKind OperandKind { get; set; }

    public int SortOrder { get; set; }
}
