using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Formulas.Functions;
using Reporting.Database;

namespace Reporting.DAL.Formulas;

/// <summary>A catalogue function ready to call: its database definition joined to the server implementation that runs it.</summary>
public sealed class FormulaFunction(FormulaFunctionDefinition definition, IFormulaFunctionImplementation implementation)
{
    public FormulaFunctionDefinition Definition { get; } = definition;
    public IFormulaFunctionImplementation Implementation { get; } = implementation;

    /// <summary>The parameters in argument order.</summary>
    public IReadOnlyList<FormulaFunctionParameter> Parameters { get; } = definition.Parameters.OrderBy(p => p.Position).ToList();

    public string Name => Definition.Name;

    private bool IsVariadic => Parameters.Count > 0 && Parameters[^1].IsVariadic;

    /// <summary>The fewest arguments a call needs: every parameter that isn't optional.</summary>
    public int MinArguments => Parameters.Count(p => !p.IsOptional);

    /// <summary>The most arguments a call may have; null when the last parameter repeats.</summary>
    public int? MaxArguments => IsVariadic ? null : Parameters.Count;

    /// <summary>The parameter the argument at <paramref name="index"/> answers to (the repeating last one for any beyond the list).</summary>
    public FormulaFunctionParameter ParameterFor(int index) => Parameters[Math.Min(index, Parameters.Count - 1)];

    public string Signature =>
        $"{Name}({string.Join(", ", Parameters.Select(p => p.IsVariadic ? $"{p.Name}, …" : p.IsOptional ? $"[{p.Name}]" : p.Name))})";
}

/// <summary>
/// The functions a formula may call: the database's definitions joined to the server's implementations.
/// A definition that is disabled, or whose <c>ImplementationKey</c> has no implementation, isn't callable —
/// a formula using it is reported as invalid instead of failing when it runs.
/// </summary>
public sealed class FormulaFunctionCatalogue
{
    private readonly Dictionary<string, FormulaFunction> _available = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, string> _unavailable = new(StringComparer.OrdinalIgnoreCase);

    private FormulaFunctionCatalogue() { }

    /// <summary>The seeded catalogue, built in memory — for when there's no database to read (unit tests).</summary>
    public static FormulaFunctionCatalogue Default { get; } = FromSeedData();

    public static FormulaFunctionCatalogue Build(
        IEnumerable<FormulaFunctionDefinition> definitions,
        IReadOnlyDictionary<string, IFormulaFunctionImplementation> implementations)
    {
        var catalogue = new FormulaFunctionCatalogue();
        foreach (var definition in definitions)
        {
            if (!definition.IsEnabled)
                catalogue._unavailable[definition.Name] = $"The function {definition.Name} is currently disabled.";
            else if (!implementations.TryGetValue(definition.ImplementationKey, out var implementation))
                catalogue._unavailable[definition.Name] = $"The function {definition.Name} has no implementation on this server.";
            else
                catalogue._available[definition.Name] = new FormulaFunction(definition, implementation);
        }

        return catalogue;
    }

    /// <summary>Every callable function, by category then display order.</summary>
    public IReadOnlyList<FormulaFunction> All =>
        _available.Values.OrderBy(f => f.Definition.Category).ThenBy(f => f.Definition.SortOrder).ToList();

    public FormulaFunction? Find(string name) => _available.GetValueOrDefault(name);

    /// <summary>Why a known function can't be called, or null when the name isn't a known function at all.</summary>
    public string? WhyUnavailable(string name) => _unavailable.GetValueOrDefault(name);

    public List<FormulaFunctionDto> ToDtos() => All.Select(f => new FormulaFunctionDto
    {
        Name = f.Name,
        Category = f.Definition.Category,
        Description = f.Definition.Description,
        Example = f.Definition.Example,
        ReturnKind = f.Definition.ReturnKind,
        Parameters = f.Parameters.Select(p => new FormulaParameterDto
        {
            Name = p.Name,
            Kind = p.Kind,
            IsOptional = p.IsOptional,
            IsVariadic = p.IsVariadic
        }).ToList()
    }).ToList();

    private static FormulaFunctionCatalogue FromSeedData()
    {
        var (functions, parameters) = FormulaFunctionSeedData.Rows();
        var byFunction = parameters.ToLookup(p => p.FormulaFunctionDefinitionId);
        foreach (var function in functions) function.Parameters = byFunction[function.Id].ToList();

        return Build(functions, FormulaFunctionImplementations.All);
    }
}

/// <summary>Reads the function catalogue from the database, once per request.</summary>
public sealed class FormulaFunctionCatalogueLoader(ReportingDbContext db)
{
    private FormulaFunctionCatalogue? _catalogue;

    public async Task<FormulaFunctionCatalogue> GetAsync()
    {
        if (_catalogue is not null) return _catalogue;

        var definitions = await db.FormulaFunctionDefinitions.AsNoTracking().Include(f => f.Parameters).ToListAsync();
        return _catalogue = FormulaFunctionCatalogue.Build(definitions, FormulaFunctionImplementations.All);
    }
}
