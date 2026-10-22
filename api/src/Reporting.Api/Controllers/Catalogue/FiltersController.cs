using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FiltersController(ReportingDbContext db) : ControllerBase
{
    /// <summary>Which operators each column type supports, so the UI only offers what the server accepts.</summary>
    [HttpGet("operators")]
    public async Task<ActionResult<List<FilterOperatorsForTypeDto>>> GetOperators()
    {
        return FilterOperators.ToCatalogueDto(await FilterOperators.LoadCatalogueAsync(db));
    }
}
