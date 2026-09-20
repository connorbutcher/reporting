using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// One operator offerable on one column type: its display label and what operand(s) it needs.
/// A fixed reference set, seeded so the catalogue served to the client — and used for the
/// server-side validation in <c>ConditionTranslator</c> — is read from the database rather than
/// compiled into the API, and the two can never disagree about what's offerable.
/// </summary>
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
