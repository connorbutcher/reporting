using Reporting.Abstractions;

namespace Reporting.Database.FormulaSeed;

/// <summary>One function of the seeded catalogue, before it is turned into database rows.</summary>
public sealed record FormulaFunctionSpec(
    string Name,
    FormulaFunctionCategory Category,
    FormulaValueKind Returns,
    bool PropagatesNull,
    string Description,
    string Example,
    FormulaParameterSpec[] Parameters);
