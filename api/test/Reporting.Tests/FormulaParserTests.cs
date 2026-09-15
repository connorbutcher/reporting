using Reporting.DAL.Formulas;
using Reporting.DAL.Formulas.Ast;

namespace Reporting.Tests;

/// <summary>Exercises the hand-rolled lexer/parser directly — grammar, precedence, and the error
/// messages a save-time validation failure surfaces.</summary>
public class FormulaParserTests
{
    [Fact]
    public void Parses_arithmetic_with_standard_precedence()
    {
        // 2 + 3 * 4 should group as 2 + (3 * 4), not (2 + 3) * 4.
        var ast = FormulaParser.Parse("2 + 3 * 4");

        var add = Assert.IsType<BinaryOperation>(ast);
        Assert.Equal("+", add.Operator);
        Assert.Equal(new NumberLiteral(2), add.Left);
        var mul = Assert.IsType<BinaryOperation>(add.Right);
        Assert.Equal("*", mul.Operator);
    }

    [Fact]
    public void Parentheses_override_precedence()
    {
        var ast = FormulaParser.Parse("(2 + 3) * 4");

        var mul = Assert.IsType<BinaryOperation>(ast);
        Assert.Equal("*", mul.Operator);
        Assert.IsType<BinaryOperation>(mul.Left);
    }

    [Fact]
    public void Parses_column_references()
    {
        var ast = FormulaParser.Parse("[Measured Diameter] - [Nominal]");

        var op = Assert.IsType<BinaryOperation>(ast);
        Assert.Equal(new ColumnReference("Measured Diameter"), op.Left);
        Assert.Equal(new ColumnReference("Nominal"), op.Right);
    }

    [Fact]
    public void Parses_function_calls_with_nested_arguments()
    {
        var ast = FormulaParser.Parse("ROUND([Value] / 2, 3)");

        var call = Assert.IsType<FunctionCall>(ast);
        Assert.Equal("ROUND", call.Name);
        Assert.Equal(2, call.Arguments.Count);
        Assert.IsType<BinaryOperation>(call.Arguments[0]);
        Assert.Equal(new NumberLiteral(3), call.Arguments[1]);
    }

    [Fact]
    public void Parses_boolean_keywords_and_string_literals()
    {
        var ast = FormulaParser.Parse("IF([Pass], \"OK\", TRUE)");

        var call = Assert.IsType<FunctionCall>(ast);
        Assert.Equal("IF", call.Name);
        Assert.Equal(new ColumnReference("Pass"), call.Arguments[0]);
        Assert.Equal(new StringLiteral("OK"), call.Arguments[1]);
        Assert.Equal(new BoolLiteral(true), call.Arguments[2]);
    }

    [Fact]
    public void And_binds_tighter_than_or()
    {
        // A OR B AND C should group as A OR (B AND C).
        var ast = FormulaParser.Parse("[A] OR [B] AND [C]");

        var or = Assert.IsType<BinaryOperation>(ast);
        Assert.Equal("OR", or.Operator);
        Assert.Equal(new ColumnReference("A"), or.Left);
        var and = Assert.IsType<BinaryOperation>(or.Right);
        Assert.Equal("AND", and.Operator);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Blank_expression_is_rejected(string expression)
    {
        Assert.Throws<FormulaParseException>(() => FormulaParser.Parse(expression));
    }

    [Fact]
    public void Unterminated_column_reference_is_rejected()
    {
        Assert.Throws<FormulaParseException>(() => FormulaParser.Parse("[Diameter + 1"));
    }

    [Fact]
    public void Unbalanced_parentheses_are_rejected()
    {
        Assert.Throws<FormulaParseException>(() => FormulaParser.Parse("(1 + 2"));
    }

    [Fact]
    public void Trailing_garbage_is_rejected()
    {
        Assert.Throws<FormulaParseException>(() => FormulaParser.Parse("1 + 2 3"));
    }

    [Fact]
    public void Chained_comparisons_are_rejected()
    {
        // Comparison is non-chaining by design — "1 < 2 < 3" isn't valid, unlike Python.
        Assert.Throws<FormulaParseException>(() => FormulaParser.Parse("1 < 2 < 3"));
    }

    [Fact]
    public void Referenced_column_names_are_collected_from_the_whole_tree()
    {
        var ast = FormulaParser.Parse("IF([A] > [B], [C], [A])");

        var names = FormulaParser.ReferencedColumnNames(ast);

        Assert.Equal(new HashSet<string> { "A", "B", "C" }, names);
    }
}
