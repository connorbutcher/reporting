namespace Reporting.Abstractions;

/// <summary>A problem in an expression, with where it sits in the text so the editor can point at it.</summary>
public class FormulaErrorDto
{
    public string Message { get; set; } = string.Empty;
    public int Position { get; set; }
    public int Length { get; set; }
}
