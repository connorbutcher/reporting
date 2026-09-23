namespace Reporting.DAL.Formulas.Functions;

/// <summary>
/// Every function implementation the server has, by key. Each is its own class, grouped into a folder per
/// category, and is found here by scanning for <see cref="IFormulaFunctionImplementation"/> types — so adding
/// a function means adding a class. The catalogue table decides which implementations a formula may call (and
/// how); a row whose <c>ImplementationKey</c> isn't here is reported as unavailable, and an implementation with
/// no row simply can't be reached. A new function also needs its definition row (a migration that inserts into
/// FormulaFunctionDefinitions/Parameters).
/// </summary>
public static class FormulaFunctionImplementations
{
    public static IReadOnlyDictionary<string, IFormulaFunctionImplementation> All { get; } = Discover();

    private static Dictionary<string, IFormulaFunctionImplementation> Discover() =>
        typeof(IFormulaFunctionImplementation).Assembly
            .GetTypes()
            .Where(t => t is { IsClass: true, IsAbstract: false } && t.IsAssignableTo(typeof(IFormulaFunctionImplementation)))
            .Where(t => t.GetConstructor(Type.EmptyTypes) is not null)
            .Select(t => (IFormulaFunctionImplementation)Activator.CreateInstance(t)!)
            .ToDictionary(f => f.Key, StringComparer.OrdinalIgnoreCase);
}
