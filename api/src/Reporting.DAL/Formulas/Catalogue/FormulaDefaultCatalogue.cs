using Reporting.DAL.Formulas.Functions;
using Reporting.Database;

namespace Reporting.DAL.Formulas.Catalogue;

/// <summary>Builds the catalogue from the seed data, in memory, with no database.</summary>
public static class FormulaDefaultCatalogue
{
    public static FormulaFunctionCatalogue Create()
    {
        var (functions, parameters) = FormulaFunctionSeedData.Rows();
        var byFunction = parameters.ToLookup(p => p.FormulaFunctionDefinitionId);
        foreach (var function in functions)
        {
            function.Parameters = byFunction[function.Id].ToList();
        }

        return FormulaFunctionCatalogue.Build(functions, FormulaFunctionImplementations.All);
    }
}
