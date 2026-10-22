namespace Reporting.Abstractions;

public class FormulaErrorDto
{
    public string Message { get; set; } = string.Empty;
    public int Position { get; set; }
    public int Length { get; set; }
}
