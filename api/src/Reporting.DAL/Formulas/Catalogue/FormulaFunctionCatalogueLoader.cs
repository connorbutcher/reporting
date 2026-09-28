using Microsoft.EntityFrameworkCore;
using Reporting.DAL.Formulas.Functions;
using Reporting.Database;

namespace Reporting.DAL.Formulas.Catalogue;

/// <summary>Reads the function catalogue from the database, once per request.</summary>
public sealed class FormulaFunctionCatalogueLoader(ReportingDbContext db)
{
    private FormulaFunctionCatalogue? _catalogue;

    public async Task<FormulaFunctionCatalogue> GetAsync()
    {
        if (_catalogue is not null)
        {
            return _catalogue;
        }

        var definitions = await db.FormulaFunctionDefinitions.AsNoTracking().Include(f => f.Parameters).ToListAsync();
        _catalogue = FormulaFunctionCatalogue.Build(definitions, FormulaFunctionImplementations.All);
        return _catalogue;
    }
}
