namespace Reporting.DAL.Formulas.Functions;

/// <summary>Typed reads of an argument list, for implementations.</summary>
public static class FormulaArgs
{
    public static double Number(IReadOnlyList<object?> args, int index)
    {
        return (double)args[index]!;
    }

    public static string Text(IReadOnlyList<object?> args, int index)
    {
        return (string)args[index]!;
    }

    public static bool Bool(IReadOnlyList<object?> args, int index)
    {
        return (bool)args[index]!;
    }

    public static DateTime Date(IReadOnlyList<object?> args, int index)
    {
        return (DateTime)args[index]!;
    }

    /// <summary>The numeric argument at <paramref name="index"/> truncated to a whole number, or <paramref name="fallback"/> when it wasn't supplied.</summary>
    public static int WholeNumber(IReadOnlyList<object?> args, int index, int fallback)
    {
        if (index >= args.Count)
        {
            return fallback;
        }

        return (int)Math.Clamp(Math.Truncate((double)args[index]!), int.MinValue, int.MaxValue);
    }

    /// <summary>Every non-blank number in the list (for the aggregating functions that ignore blanks).</summary>
    public static List<double> Numbers(IReadOnlyList<object?> args)
    {
        var numbers = new List<double>(args.Count);
        foreach (var value in args)
        {
            if (value is double number)
            {
                numbers.Add(number);
            }
        }

        return numbers;
    }
}
