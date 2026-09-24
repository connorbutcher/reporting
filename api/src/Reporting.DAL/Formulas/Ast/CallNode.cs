namespace Reporting.DAL.Formulas.Ast;

/// <summary>A call to a catalogue function. <see cref="NamePosition"/>/<see cref="NameLength"/> span just the name, for "unknown function" errors.</summary>
public sealed record CallNode(string Name, IReadOnlyList<FormulaNode> Arguments, int Position, int Length, int NamePosition, int NameLength)
    : FormulaNode(Position, Length);
