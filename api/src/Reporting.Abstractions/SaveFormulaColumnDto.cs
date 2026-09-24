namespace Reporting.Abstractions;

/// <summary>Creates or replaces a formula column. A null <see cref="Type"/> takes the type the expression evaluates to.</summary>
public class SaveFormulaColumnDto
{
    public string Name { get; set; } = string.Empty;
    public string Expression { get; set; } = string.Empty;
    public DatasetColumnType? Type { get; set; }
}
