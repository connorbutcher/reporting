using Reporting.Abstractions;

namespace Reporting.Database.FormulaSeed;

/// <summary>One parameter of a seeded function.</summary>
public sealed record FormulaParameterSpec(string Name, FormulaValueKind Kind, bool IsOptional = false, bool IsVariadic = false);
