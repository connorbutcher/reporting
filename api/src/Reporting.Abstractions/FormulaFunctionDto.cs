namespace Reporting.Abstractions;

/// <summary>One function a formula can call, as the formula builder's palette lists it.</summary>
public class FormulaFunctionDto
{
    public string Name { get; set; } = string.Empty;
    public FormulaFunctionCategory Category { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Example { get; set; } = string.Empty;
    public FormulaValueKind ReturnKind { get; set; }
    public List<FormulaParameterDto> Parameters { get; set; } = new();
}
