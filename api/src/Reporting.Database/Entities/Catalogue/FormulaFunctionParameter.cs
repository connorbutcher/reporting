using Reporting.Abstractions;

namespace Reporting.Database;

public class FormulaFunctionParameter
{
    public int Id { get; set; }
    public int FormulaFunctionDefinitionId { get; set; }
    public FormulaFunctionDefinition? FormulaFunctionDefinition { get; set; }

    /// <summary>Zero-based.</summary>
    public int Position { get; set; }

    public string Name { get; set; } = string.Empty;
    public FormulaValueKind Kind { get; set; }
    public bool IsOptional { get; set; }

    /// <summary>Last parameter only: repeats, needing at least one argument unless also optional.</summary>
    public bool IsVariadic { get; set; }
}
