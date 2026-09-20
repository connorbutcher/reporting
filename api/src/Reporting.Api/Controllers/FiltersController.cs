using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FiltersController(ReportingDbContext db) : ControllerBase
{
    /// <summary>
    /// Which operators each column type supports. The filter panel builds its dropdowns from
    /// this so the UI can only ever offer what the server accepts. Read from the
    /// FilterOperatorDefinitions table, so relabelling or reordering an operator is a data change,
    /// not a redeploy.
    /// </summary>
    [HttpGet("operators")]
    public async Task<ActionResult<List<FilterOperatorsForTypeDto>>> GetOperators() =>
        FilterOperators.ToCatalogueDto(await FilterOperators.LoadCatalogueAsync(db));
}
