using Microsoft.AspNetCore.Mvc;
using Reporting.Api.Contracts;
using Reporting.Api.Filtering;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FiltersController : ControllerBase
{
    /// <summary>
    /// Which operators each column type supports. The filter panel builds its
    /// dropdowns from this so the UI can only ever offer what the server accepts.
    /// </summary>
    [HttpGet("operators")]
    public ActionResult<List<FilterOperatorsForTypeDto>> GetOperators() => FilterOperators.Catalogue();
}
