using System.Globalization;
using Reporting.DAL.Formulas.Ast;

namespace Reporting.DAL.Formulas;

/// <summary>
/// Recursive-descent parser for the formula grammar (lowest to highest precedence):
/// <code>
/// expr       := or
/// or         := and ("OR" and)*
/// and        := not ("AND" not)*
/// not        := "NOT" not | comparison
/// comparison := additive (("=" | "&lt;&gt;" | "&lt;" | "&lt;=" | "&gt;" | "&gt;=") additive)?
/// additive   := multiplicative (("+" | "-") multiplicative)*
/// multiplicative := unary (("*" | "/") unary)*
/// unary      := "-" unary | primary
/// primary    := NUMBER | STRING | TRUE | FALSE | "[" name "]" | IDENTIFIER "(" (expr ("," expr)*)? ")" | "(" expr ")"
/// </code>
/// Comparison is non-chaining (one level, like most spreadsheet-style languages) — "A = B = C" is a
/// syntax error rather than silently parsing as "(A = B) = C".
/// </summary>
public static class FormulaParser
{
    public static FormulaNode Parse(string expression)
    {
        if (string.IsNullOrWhiteSpace(expression))
            throw new FormulaParseException("A formula can't be blank.", 0);

        var cursor = new FormulaParserCursor(FormulaLexer.Tokenize(expression));
        var node = ParseOr(cursor);
        if (cursor.Current.Kind != FormulaTokenKind.End)
            throw new FormulaParseException($"Unexpected '{cursor.Current.Text}' after the formula.", cursor.Current.Position);
        return node;
    }

    private static FormulaNode ParseOr(FormulaParserCursor cursor)
    {
        var left = ParseAnd(cursor);
        while (cursor.IsKeyword("OR"))
        {
            cursor.Advance();
            left = new BinaryOperation("OR", left, ParseAnd(cursor));
        }
        return left;
    }

    private static FormulaNode ParseAnd(FormulaParserCursor cursor)
    {
        var left = ParseNot(cursor);
        while (cursor.IsKeyword("AND"))
        {
            cursor.Advance();
            left = new BinaryOperation("AND", left, ParseNot(cursor));
        }
        return left;
    }

    private static FormulaNode ParseNot(FormulaParserCursor cursor)
    {
        if (cursor.IsKeyword("NOT"))
        {
            cursor.Advance();
            return new UnaryOperation("NOT", ParseNot(cursor));
        }
        return ParseComparison(cursor);
    }

    private static readonly HashSet<string> ComparisonOperators = ["=", "<>", "<", "<=", ">", ">="];

    private static FormulaNode ParseComparison(FormulaParserCursor cursor)
    {
        var left = ParseAdditive(cursor);
        if (cursor.Current.Kind == FormulaTokenKind.Symbol && ComparisonOperators.Contains(cursor.Current.Text))
        {
            var op = cursor.Advance().Text;
            return new BinaryOperation(op, left, ParseAdditive(cursor));
        }
        return left;
    }

    private static FormulaNode ParseAdditive(FormulaParserCursor cursor)
    {
        var left = ParseMultiplicative(cursor);
        while (cursor.IsSymbol("+") || cursor.IsSymbol("-"))
        {
            var op = cursor.Advance().Text;
            left = new BinaryOperation(op, left, ParseMultiplicative(cursor));
        }
        return left;
    }

    private static FormulaNode ParseMultiplicative(FormulaParserCursor cursor)
    {
        var left = ParseUnary(cursor);
        while (cursor.IsSymbol("*") || cursor.IsSymbol("/"))
        {
            var op = cursor.Advance().Text;
            left = new BinaryOperation(op, left, ParseUnary(cursor));
        }
        return left;
    }

    private static FormulaNode ParseUnary(FormulaParserCursor cursor)
    {
        if (cursor.IsSymbol("-"))
        {
            cursor.Advance();
            return new UnaryOperation("-", ParseUnary(cursor));
        }
        return ParsePrimary(cursor);
    }

    private static FormulaNode ParsePrimary(FormulaParserCursor cursor)
    {
        var token = cursor.Current;

        switch (token.Kind)
        {
            case FormulaTokenKind.Number:
                cursor.Advance();
                return new NumberLiteral(double.Parse(token.Text, CultureInfo.InvariantCulture));

            case FormulaTokenKind.String:
                cursor.Advance();
                return new StringLiteral(token.Text);

            case FormulaTokenKind.ColumnRef:
                cursor.Advance();
                return new ColumnReference(token.Text);

            case FormulaTokenKind.Identifier when string.Equals(token.Text, "TRUE", StringComparison.OrdinalIgnoreCase):
                cursor.Advance();
                return new BoolLiteral(true);

            case FormulaTokenKind.Identifier when string.Equals(token.Text, "FALSE", StringComparison.OrdinalIgnoreCase):
                cursor.Advance();
                return new BoolLiteral(false);

            case FormulaTokenKind.Identifier:
                return ParseFunctionCall(cursor);

            case FormulaTokenKind.Symbol when token.Text == "(":
                cursor.Advance();
                var inner = ParseOr(cursor);
                cursor.ExpectSymbol(")");
                return inner;

            default:
                throw new FormulaParseException(
                    token.Kind == FormulaTokenKind.End
                        ? "The formula ends unexpectedly — something is missing."
                        : $"Unexpected '{token.Text}'.",
                    token.Position);
        }
    }

    private static FormulaNode ParseFunctionCall(FormulaParserCursor cursor)
    {
        var name = cursor.Advance().Text;
        cursor.ExpectSymbol("(");

        var args = new List<FormulaNode>();
        if (!cursor.IsSymbol(")"))
        {
            args.Add(ParseOr(cursor));
            while (cursor.IsSymbol(","))
            {
                cursor.Advance();
                args.Add(ParseOr(cursor));
            }
        }
        cursor.ExpectSymbol(")");
        return new FunctionCall(name, args);
    }

    /// <summary>Every column referenced by <c>[Name]</c> anywhere in the tree, de-duplicated.</summary>
    public static IReadOnlySet<string> ReferencedColumnNames(FormulaNode node)
    {
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        Collect(node, names);
        return names;

        static void Collect(FormulaNode node, HashSet<string> names)
        {
            switch (node)
            {
                case ColumnReference column:
                    names.Add(column.ColumnName);
                    break;
                case UnaryOperation unary:
                    Collect(unary.Operand, names);
                    break;
                case BinaryOperation binary:
                    Collect(binary.Left, names);
                    Collect(binary.Right, names);
                    break;
                case FunctionCall call:
                    foreach (var arg in call.Arguments) Collect(arg, names);
                    break;
            }
        }
    }
}
