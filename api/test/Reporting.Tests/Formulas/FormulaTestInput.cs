using Reporting.Abstractions;

namespace Reporting.Tests.Formulas;

/// <summary>A named column and the value it holds on the one row a test evaluates a formula over. A blank is a null value, which needs its type stated.</summary>
public sealed record FormulaTestInput(string Name, object? Value, DatasetColumnType? Type = null);
