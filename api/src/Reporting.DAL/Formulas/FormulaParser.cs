namespace Reporting.DAL.Formulas;

/// <summary>
/// Recursive-descent parser for the formula language. Precedence, loosest to tightest:
/// OR, AND, NOT, comparison (not chainable), <c>&amp;</c>, <c>+ -</c>, <c>* / %</c>, unary sign, <c>^</c> (right-associative).
/// AND/OR/NOT become calls to the catalogue functions of the same name, so how they treat blanks is data like any other function's.
/// </summary>
public sealed class FormulaParser
{
    private static readonly HashSet<string> ComparisonOperators = ["=", "<>", "<", "<=", ">", ">="];

    private readonly List<FormulaToken> _tokens;
    private int _index;

    private FormulaParser(List<FormulaToken> tokens) => _tokens = tokens;

    /// <summary>Parses formula text, throwing <see cref="FormulaSyntaxException"/> for the first problem.</summary>
    public static FormulaNode Parse(string source)
    {
        var parser = new FormulaParser(FormulaLexer.Tokenize(source));
        if (parser.Current.Kind == FormulaTokenKind.End)
            throw new FormulaSyntaxException("Enter a formula.", 0, 0);

        var root = parser.ParseOr();
        if (parser.Current.Kind != FormulaTokenKind.End)
        {
            throw new FormulaSyntaxException(
                $"Unexpected '{parser.Current.Text}'.", parser.Current.Position, Math.Max(1, parser.Current.Length));
        }

        return root;
    }

    private FormulaToken Current => _tokens[_index];

    private int PreviousEnd => _index == 0 ? 0 : _tokens[_index - 1].End;

    private FormulaToken Advance() => _tokens[_index++];

    private bool IsKeyword(string word) =>
        Current.Kind == FormulaTokenKind.Identifier && string.Equals(Current.Text, word, StringComparison.OrdinalIgnoreCase);

    private bool IsOperator(string op) => Current.Kind == FormulaTokenKind.Operator && Current.Text == op;

    private CallNode LogicalCall(string name, FormulaToken keyword, FormulaNode left, FormulaNode right) =>
        new(name, [left, right], left.Position, PreviousEnd - left.Position, keyword.Position, keyword.Length);

    private FormulaNode ParseOr()
    {
        var left = ParseAnd();
        while (IsKeyword("OR") && !NextIsLeftParen())
        {
            var keyword = Advance();
            left = LogicalCall("OR", keyword, left, ParseAnd());
        }

        return left;
    }

    private FormulaNode ParseAnd()
    {
        var left = ParseNot();
        while (IsKeyword("AND") && !NextIsLeftParen())
        {
            var keyword = Advance();
            left = LogicalCall("AND", keyword, left, ParseNot());
        }

        return left;
    }

    private FormulaNode ParseNot()
    {
        // "NOT(x)" is the ordinary function call; only a bare "NOT x" is the prefix keyword.
        if (IsKeyword("NOT") && !NextIsLeftParen())
        {
            var keyword = Advance();
            var operand = ParseNot();
            return new CallNode("NOT", [operand], keyword.Position, PreviousEnd - keyword.Position, keyword.Position, keyword.Length);
        }

        return ParseComparison();
    }

    private bool NextIsLeftParen() =>
        _index + 1 < _tokens.Count && _tokens[_index + 1].Kind == FormulaTokenKind.LeftParen;

    private FormulaNode ParseComparison()
    {
        var left = ParseConcat();
        if (Current.Kind == FormulaTokenKind.Operator && ComparisonOperators.Contains(Current.Text))
        {
            var op = Advance();
            var right = ParseConcat();
            left = new BinaryNode(op.Text, left, right, left.Position, PreviousEnd - left.Position);

            if (Current.Kind == FormulaTokenKind.Operator && ComparisonOperators.Contains(Current.Text))
            {
                throw new FormulaSyntaxException(
                    "Comparisons can't be chained; combine them with AND or OR.", Current.Position, Current.Length);
            }
        }

        return left;
    }

    private FormulaNode ParseConcat()
    {
        var left = ParseAdditive();
        while (IsOperator("&"))
        {
            var op = Advance();
            var right = ParseAdditive();
            left = new BinaryNode(op.Text, left, right, left.Position, PreviousEnd - left.Position);
        }

        return left;
    }

    private FormulaNode ParseAdditive()
    {
        var left = ParseMultiplicative();
        while (IsOperator("+") || IsOperator("-"))
        {
            var op = Advance();
            var right = ParseMultiplicative();
            left = new BinaryNode(op.Text, left, right, left.Position, PreviousEnd - left.Position);
        }

        return left;
    }

    private FormulaNode ParseMultiplicative()
    {
        var left = ParseUnary();
        while (IsOperator("*") || IsOperator("/") || IsOperator("%"))
        {
            var op = Advance();
            var right = ParseUnary();
            left = new BinaryNode(op.Text, left, right, left.Position, PreviousEnd - left.Position);
        }

        return left;
    }

    private FormulaNode ParseUnary()
    {
        if (IsOperator("-") || IsOperator("+"))
        {
            var op = Advance();
            var operand = ParseUnary();
            return new UnaryNode(op.Text, operand, op.Position, PreviousEnd - op.Position);
        }

        return ParsePower();
    }

    private FormulaNode ParsePower()
    {
        var left = ParsePrimary();
        if (IsOperator("^"))
        {
            var op = Advance();
            var right = ParseUnary(); // right-associative, and lets "2 ^ -1" through
            return new BinaryNode(op.Text, left, right, left.Position, PreviousEnd - left.Position);
        }

        return left;
    }

    private FormulaNode ParsePrimary()
    {
        var token = Current;
        switch (token.Kind)
        {
            case FormulaTokenKind.Number:
                Advance();
                return new NumberNode(token.Number, token.Position, token.Length);

            case FormulaTokenKind.Text:
                Advance();
                return new TextNode(token.Text, token.Position, token.Length);

            case FormulaTokenKind.Column:
                Advance();
                return new ColumnNode(token.Text, token.Position, token.Length);

            case FormulaTokenKind.LeftParen:
            {
                Advance();
                var inner = ParseOr();
                if (Current.Kind != FormulaTokenKind.RightParen)
                    throw new FormulaSyntaxException("Missing closing ')'.", token.Position, 1);
                Advance();
                return inner;
            }

            case FormulaTokenKind.Identifier:
                return ParseIdentifier();

            case FormulaTokenKind.End:
                throw new FormulaSyntaxException("The formula ends unexpectedly; a value is missing.", token.Position, 0);

            default:
                throw new FormulaSyntaxException($"Unexpected '{token.Text}'.", token.Position, Math.Max(1, token.Length));
        }
    }

    private FormulaNode ParseIdentifier()
    {
        var name = Advance();

        if (Current.Kind != FormulaTokenKind.LeftParen)
        {
            if (name.Text.Equals("TRUE", StringComparison.OrdinalIgnoreCase)) return new BoolNode(true, name.Position, name.Length);
            if (name.Text.Equals("FALSE", StringComparison.OrdinalIgnoreCase)) return new BoolNode(false, name.Position, name.Length);
            if (name.Text.Equals("NULL", StringComparison.OrdinalIgnoreCase)) return new NullNode(name.Position, name.Length);

            throw new FormulaSyntaxException(
                $"'{name.Text}' isn't a value or function call. Column names go in [square brackets].", name.Position, name.Length);
        }

        Advance(); // (
        var arguments = new List<FormulaNode>();
        if (Current.Kind != FormulaTokenKind.RightParen)
        {
            while (true)
            {
                arguments.Add(ParseOr());
                if (Current.Kind != FormulaTokenKind.Comma) break;
                Advance();
            }
        }

        if (Current.Kind != FormulaTokenKind.RightParen)
            throw new FormulaSyntaxException($"Missing closing ')' for {name.Text.ToUpperInvariant()}(.", name.Position, name.Length);
        Advance();

        return new CallNode(name.Text.ToUpperInvariant(), arguments, name.Position, PreviousEnd - name.Position, name.Position, name.Length);
    }
}
