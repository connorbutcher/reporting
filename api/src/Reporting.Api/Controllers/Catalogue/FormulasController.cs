using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FormulasController(DatasetFormulaRepository formulas) : ControllerBase
{
    /// <summary>The functions a formula can call, with their signatures, for the builder's palette.</summary>
    [HttpGet("functions")]
    public async Task<List<FormulaFunctionDto>> GetFunctions()
    {
        return await formulas.GetFunctionsAsync();
    }
}
