namespace Reporting.DAL.Formulas.Functions.Strings;

/// <summary>Shared by TEXTBEFORE and TEXTAFTER.</summary>
internal static class Delimiters
{
    /// <summary>
    /// Where the nth occurrence of the delimiter starts, ignoring case: counting from the start for a positive
    /// occurrence and from the end for a negative one. -1 when there isn't one (or the delimiter is empty).
    /// </summary>
    public static int IndexOf(string text, string delimiter, int occurrence)
    {
        if (delimiter.Length == 0 || occurrence == 0)
        {
            return -1;
        }

        var index = occurrence > 0 ? -delimiter.Length : text.Length;
        for (var found = 0; found < Math.Abs(occurrence); found++)
        {
            index = occurrence > 0
                ? Next(text, delimiter, index + delimiter.Length)
                : Previous(text, delimiter, index - 1);
            if (index < 0)
            {
                return -1;
            }
        }

        return index;
    }

    private static int Next(string text, string delimiter, int from)
    {
        return from > text.Length ? -1 : text.IndexOf(delimiter, from, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>The last occurrence that ends at or before <paramref name="lastEnd"/> (a character index).</summary>
    private static int Previous(string text, string delimiter, int lastEnd)
    {
        if (lastEnd < delimiter.Length - 1)
        {
            return -1;
        }

        return text.LastIndexOf(delimiter, lastEnd, StringComparison.OrdinalIgnoreCase);
    }
}
