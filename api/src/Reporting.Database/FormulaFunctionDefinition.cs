using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// A function a formula can call: its name, signature, and how it behaves with blanks. The catalogue is
/// data — the formula builder's palette, argument checking and result typing all read these rows — while
/// the code that actually runs a function lives on the server, found through <see cref="ImplementationKey"/>.
/// Disabling a row (or pointing it at a different implementation) changes what formulas can do without a deploy.
/// </summary>
public class FormulaFunctionDefinition
{
    public int Id { get; set; }

    /// <summary>What a formula writes to call it, e.g. ROUND. Unique, matched case-insensitively.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Names the server-side implementation that runs this function. A definition whose key has no implementation is unavailable to formulas.</summary>
    public string ImplementationKey { get; set; } = string.Empty;

    public FormulaFunctionCategory Category { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Example { get; set; } = string.Empty;

    /// <summary>What the function returns. <see cref="FormulaValueKind.Any"/> follows the kind of its <c>Any</c> arguments.</summary>
    public FormulaValueKind ReturnKind { get; set; }

    /// <summary>When true a blank in any argument makes the result blank without running the implementation; functions that give blanks meaning (IF, COALESCE, SUM…) set it false and handle them.</summary>
    public bool PropagatesNull { get; set; }

    public bool IsEnabled { get; set; } = true;

    /// <summary>Display order within its category.</summary>
    public int SortOrder { get; set; }

    public List<FormulaFunctionParameter> Parameters { get; set; } = new();
}

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
