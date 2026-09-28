using Reporting.DAL.Formulas.Functions;
using Reporting.Database;

namespace Reporting.DAL.Formulas.Catalogue;

/// <summary>
/// The functions a formula may call: the database's definitions joined to the server's implementations.
/// A definition that is disabled, or whose <c>ImplementationKey</c> has no implementation, isn't callable —
/// a formula using it is reported as invalid instead of failing when it runs.
/// </summary>
public sealed class FormulaFunctionCatalogue
{
    private readonly Dictionary<string, FormulaFunction> _available = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, string> _unavailable = new(StringComparer.OrdinalIgnoreCase);
    private IReadOnlyList<FormulaFunction> _all = [];

    private FormulaFunctionCatalogue()
    {
    }

    /// <summary>The seeded catalogue, built in memory — for when there's no database to read (unit tests).</summary>
    public static FormulaFunctionCatalogue Default { get; } = FormulaDefaultCatalogue.Create();

    /// <summary>Every callable function, by category then display order. Worked out once, when the catalogue is built.</summary>
    public IReadOnlyList<FormulaFunction> All
    {
        get
        {
            return _all;
        }
    }

    public static FormulaFunctionCatalogue Build(
        IEnumerable<FormulaFunctionDefinition> definitions,
        IReadOnlyDictionary<string, IFormulaFunctionImplementation> implementations)
    {
        var catalogue = new FormulaFunctionCatalogue();
        foreach (var definition in definitions)
        {
            catalogue.Register(definition, implementations);
        }

        catalogue._all = catalogue._available.Values
            .OrderBy(f => f.Definition.Category)
            .ThenBy(f => f.Definition.SortOrder)
            .ToList();
        return catalogue;
    }

    public FormulaFunction? Find(string name)
    {
        return _available.GetValueOrDefault(name);
    }

    /// <summary>Why a known function can't be called, or null when the name isn't a known function at all.</summary>
    public string? WhyUnavailable(string name)
    {
        return _unavailable.GetValueOrDefault(name);
    }

    private void Register(FormulaFunctionDefinition definition, IReadOnlyDictionary<string, IFormulaFunctionImplementation> implementations)
    {
        if (!definition.IsEnabled)
        {
            _unavailable[definition.Name] = $"The function {definition.Name} is currently disabled.";
            return;
        }

        if (!implementations.TryGetValue(definition.ImplementationKey, out var implementation))
        {
            _unavailable[definition.Name] = $"The function {definition.Name} has no implementation on this server.";
            return;
        }

        _available[definition.Name] = new FormulaFunction(definition, implementation);
    }
}
