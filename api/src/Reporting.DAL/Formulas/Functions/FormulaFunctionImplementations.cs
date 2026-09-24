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

    private static Dictionary<string, IFormulaFunctionImplementation> Discover()
    {
        var implementations = new Dictionary<string, IFormulaFunctionImplementation>(StringComparer.OrdinalIgnoreCase);

        foreach (var type in typeof(IFormulaFunctionImplementation).Assembly.GetTypes())
        {
            if (!IsImplementation(type))
            {
                continue;
            }

            var implementation = (IFormulaFunctionImplementation)Activator.CreateInstance(type)!;
            implementations.Add(implementation.Key, implementation);
        }

        return implementations;
    }

    private static bool IsImplementation(Type type)
    {
        return type is { IsClass: true, IsAbstract: false }
            && type.IsAssignableTo(typeof(IFormulaFunctionImplementation))
            && type.GetConstructor(Type.EmptyTypes) is not null;
    }
}
