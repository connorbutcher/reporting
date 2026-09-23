namespace Reporting.DAL.Formulas.Functions;

/// <summary>
/// The code behind a catalogue function. The database row says what the function is called, what it takes and
/// how blanks behave; this says what it does. Arguments arrive already checked against the row's parameter
/// kinds (so a Number parameter holds a <c>double</c>), and — for functions that don't handle blanks
/// themselves — already known to be non-blank. Return <c>null</c> for a blank result; throw
/// <see cref="FormulaEvaluationException"/> only for an argument that can never work (an unknown unit).
/// </summary>
public interface IFormulaFunctionImplementation
{
    /// <summary>Matches <c>FormulaFunctionDefinition.ImplementationKey</c>; compared case-insensitively.</summary>
    string Key { get; }

    object? Invoke(IReadOnlyList<object?> args);
}


/// <summary>Typed reads of an argument list, for implementations.</summary>
public static class FormulaArgs
{
    public static double Number(IReadOnlyList<object?> args, int index) => (double)args[index]!;
    public static string Text(IReadOnlyList<object?> args, int index) => (string)args[index]!;
    public static bool Bool(IReadOnlyList<object?> args, int index) => (bool)args[index]!;
    public static DateTime Date(IReadOnlyList<object?> args, int index) => (DateTime)args[index]!;

    /// <summary>The numeric argument at <paramref name="index"/> truncated to a whole number, or <paramref name="fallback"/> when it wasn't supplied.</summary>
    public static int WholeNumber(IReadOnlyList<object?> args, int index, int fallback) =>
        index < args.Count ? (int)Math.Clamp(Math.Truncate((double)args[index]!), int.MinValue, int.MaxValue) : fallback;

    /// <summary>Every non-blank number in the list (for the aggregating functions that ignore blanks).</summary>
    public static List<double> Numbers(IReadOnlyList<object?> args) =>
        args.OfType<double>().ToList();
}
