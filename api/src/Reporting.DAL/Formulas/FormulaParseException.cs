namespace Reporting.DAL.Formulas;

/// <summary>
/// The formula's text is malformed — bad syntax, an unterminated literal, or an unexpected token.
/// Thrown by <see cref="FormulaLexer"/>/<see cref="FormulaParser"/>; always maps to a save-time 400,
/// since a formula that doesn't parse can never be saved.
/// </summary>
public sealed class FormulaParseException(string message, int position) : Exception(message)
{
    /// <summary>Character offset into the expression text where the problem was found, for the
    /// builder to highlight — 1:1 with what the client sent, since the lexer never reindexes.</summary>
    public int Position { get; } = position;
}
