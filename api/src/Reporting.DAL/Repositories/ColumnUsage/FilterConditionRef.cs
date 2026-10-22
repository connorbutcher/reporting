namespace Reporting.DAL.Repositories;

/// <summary>A filter condition's operator and raw operands, as stored — enough to tell whether it still works on another column type.</summary>
public sealed record FilterConditionRef(string Operator, IReadOnlyList<string> Values);
