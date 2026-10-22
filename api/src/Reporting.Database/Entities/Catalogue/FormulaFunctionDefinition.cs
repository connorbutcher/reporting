using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>A function formulas can call. The code that runs it is found through <see cref="ImplementationKey"/>.</summary>
public class FormulaFunctionDefinition
{
    public int Id { get; set; }

    /// <summary>e.g. ROUND. Unique, matched case-insensitively.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>A key with no server-side implementation makes the function unavailable.</summary>
    public string ImplementationKey { get; set; } = string.Empty;

    public FormulaFunctionCategory Category { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Example { get; set; } = string.Empty;

    /// <summary><see cref="FormulaValueKind.Any"/> follows the kind of its Any arguments.</summary>
    public FormulaValueKind ReturnKind { get; set; }

    /// <summary>A blank argument makes the result blank without running the function. False for IF, COALESCE, SUM and the like.</summary>
    public bool PropagatesNull { get; set; }

    public bool IsEnabled { get; set; } = true;

    /// <summary>Within its category.</summary>
    public int SortOrder { get; set; }

    public List<FormulaFunctionParameter> Parameters { get; set; } = new();
}
