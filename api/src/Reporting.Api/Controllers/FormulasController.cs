using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FormulasController(DatasetFormulaRepository formulas) : ControllerBase
{
    /// <summary>The functions a formula can call, with their signatures — for the builder's palette and hints. Read from the database, so it lists exactly what the server will accept right now.</summary>
    [HttpGet("functions")]
    public Task<List<FormulaFunctionDto>> GetFunctions() => formulas.GetFunctionsAsync();
}
