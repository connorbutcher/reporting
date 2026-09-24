namespace Reporting.DAL.Formulas.Syntax;

/// <summary>The formula text isn't well formed. Carries where, so an editor can underline it.</summary>
public sealed class FormulaSyntaxException(string message, int position, int length) : Exception(message)
{
    public int Position { get; } = position;

    public int Length { get; } = length;
}
