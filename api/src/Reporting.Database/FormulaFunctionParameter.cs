using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>One positional parameter of a <see cref="FormulaFunctionDefinition"/>.</summary>
public class FormulaFunctionParameter
{
    public int Id { get; set; }
    public int FormulaFunctionDefinitionId { get; set; }
    public FormulaFunctionDefinition? FormulaFunctionDefinition { get; set; }

    /// <summary>Zero-based position in the argument list.</summary>
    public int Position { get; set; }

    public string Name { get; set; } = string.Empty;
    public FormulaValueKind Kind { get; set; }
    public bool IsOptional { get; set; }

    /// <summary>Only on the last parameter: it repeats, accepting any number of arguments (at least one unless also optional).</summary>
    public bool IsVariadic { get; set; }
}
