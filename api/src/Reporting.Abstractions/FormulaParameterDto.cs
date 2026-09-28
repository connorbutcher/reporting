namespace Reporting.Abstractions;

public class FormulaParameterDto
{
    public string Name { get; set; } = string.Empty;
    public FormulaValueKind Kind { get; set; }
    public bool IsOptional { get; set; }

    /// <summary>The last parameter may repeat, taking any number of further arguments.</summary>
    public bool IsVariadic { get; set; }
}
