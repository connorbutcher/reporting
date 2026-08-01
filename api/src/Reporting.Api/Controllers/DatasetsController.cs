using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Reporting.Api.Contracts;
using Reporting.Api.Data;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DatasetsController : ControllerBase
{
    private readonly ReportingDbContext _db;

    public DatasetsController(ReportingDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<DatasetSummaryDto>>> GetAll()
    {
        var datasets = await _db.Datasets.ToListAsync();
        return datasets.Select(d => d.ToSummaryDto()).ToList();
    }

    [HttpGet("{id:guid}/schema")]
    public async Task<ActionResult<DatasetSchemaDto>> GetSchema(Guid id)
    {
        var dataset = await _db.Datasets
            .Include(d => d.Columns)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return NotFound();
        return dataset.ToSchemaDto();
    }

    [HttpGet("{id:guid}/data")]
    public async Task<ActionResult<DatasetDataDto>> GetData(Guid id)
    {
        var dataset = await _db.Datasets
            .Include(d => d.Rows)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return NotFound();
        return dataset.ToDataDto();
    }
}
