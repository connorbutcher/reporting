namespace Reporting.Abstractions;

public class SaveFormulaColumnDto
{
    public string Name { get; set; } = string.Empty;
    public string Expression { get; set; } = string.Empty;

    /// <summary>Null takes the type the expression evaluates to.</summary>
    public DatasetColumnType? Type { get; set; }
}
