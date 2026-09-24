namespace Reporting.DAL.Formulas.Evaluation;

/// <summary>What a computed column came to for one row: a value (null when blank) or the reason it failed.</summary>
public readonly record struct FormulaOutcome(object? Value, string? Error);
