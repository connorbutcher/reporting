namespace Reporting.DAL.Formulas;

/// <summary>Read-only cursor over a token stream — <see cref="FormulaParser"/>'s only state, kept
/// separate so the parser's grammar methods read as pure recursive descent.</summary>
internal sealed class FormulaParserCursor(List<FormulaToken> tokens)
{
    private int _index;

    public FormulaToken Current => tokens[_index];

    public FormulaToken Advance()
    {
        var token = tokens[_index];
        if (_index < tokens.Count - 1) _index++;
        return token;
    }

    public bool IsSymbol(string text) => Current.Kind == FormulaTokenKind.Symbol && Current.Text == text;

    public bool IsKeyword(string word) =>
        Current.Kind == FormulaTokenKind.Identifier && string.Equals(Current.Text, word, StringComparison.OrdinalIgnoreCase);

    public void ExpectSymbol(string text)
    {
        if (!IsSymbol(text))
        {
            throw new FormulaParseException(
                Current.Kind == FormulaTokenKind.End
                    ? $"Expected '{text}' but the formula ended."
                    : $"Expected '{text}' but found '{Current.Text}'.",
                Current.Position);
        }
        Advance();
    }
}
