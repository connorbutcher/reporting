namespace Reporting.DAL.Formulas.Syntax;

public enum FormulaTokenKind
{
    Number,
    Text,
    Column,
    Identifier,
    Operator,
    LeftParen,
    RightParen,
    Comma,
    End
}
