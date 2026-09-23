namespace Reporting.DAL.Formulas;

/// <summary>A parsed formula expression. Each node remembers its span in the source text so problems can be pointed at.</summary>
public abstract record FormulaNode(int Position, int Length);

public sealed record NumberNode(double Value, int Position, int Length) : FormulaNode(Position, Length);

public sealed record TextNode(string Value, int Position, int Length) : FormulaNode(Position, Length);

public sealed record BoolNode(bool Value, int Position, int Length) : FormulaNode(Position, Length);

/// <summary>The literal NULL — a blank value.</summary>
public sealed record NullNode(int Position, int Length) : FormulaNode(Position, Length);

/// <summary>A <c>[Column Name]</c> reference.</summary>
public sealed record ColumnNode(string Name, int Position, int Length) : FormulaNode(Position, Length);

/// <summary>A prefix operator: <c>-</c> or <c>+</c>.</summary>
public sealed record UnaryNode(string Operator, FormulaNode Operand, int Position, int Length) : FormulaNode(Position, Length);

/// <summary>An infix operator: arithmetic (<c>+ - * / % ^</c>), text join (<c>&amp;</c>) or comparison (<c>= &lt;&gt; &lt; &lt;= &gt; &gt;=</c>). AND/OR/NOT are ordinary function calls.</summary>
public sealed record BinaryNode(string Operator, FormulaNode Left, FormulaNode Right, int Position, int Length) : FormulaNode(Position, Length);

/// <summary>A call to a catalogue function. <see cref="NamePosition"/>/<see cref="NameLength"/> span just the name, for "unknown function" errors.</summary>
public sealed record CallNode(string Name, IReadOnlyList<FormulaNode> Arguments, int Position, int Length, int NamePosition, int NameLength)
    : FormulaNode(Position, Length);
