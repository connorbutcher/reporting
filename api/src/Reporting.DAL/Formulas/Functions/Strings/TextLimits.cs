namespace Reporting.DAL.Formulas.Functions.Strings;

internal static class TextLimits
{
    /// <summary>The longest text REPEAT/PADLEFT will build, so one formula can't allocate without bound across every row.</summary>
    public const int MaxLength = 10_000;
}
