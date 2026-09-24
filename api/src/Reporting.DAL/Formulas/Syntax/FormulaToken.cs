namespace Reporting.DAL.Formulas.Syntax;

/// <summary>A token with its span in the source. <see cref="Text"/> is the meaningful text: a column's name, a string literal's unescaped content, an identifier or operator as written.</summary>
public sealed record FormulaToken(FormulaTokenKind Kind, string Text, int Position, int Length, double Number = 0)
{
    public int End
    {
        get
        {
            return Position + Length;
        }
    }
}
