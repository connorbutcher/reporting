using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

/// <summary>
/// Datasets belong to a report revision. List and create are scoped to a report's draft; every other
/// action addresses a dataset by id and is authorized against the report that owns it.
/// </summary>
[ApiController]
[Route("api/datasets")]
public class DatasetsController(DatasetRepository datasets) : ControllerBase
{
    [HttpGet("~/api/dataset-sources")]
    public Task<List<DatasetSourceDto>> GetSources()
    {
        return datasets.GetSourcesAsync();
    }

    [HttpGet("~/api/reports/{reportId:int}/datasets")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<ActionResult<List<DatasetSummaryDto>>> GetForReport(int reportId)
    {
        var context = await datasets.GetDraftContextAsync(reportId);
        if (context is null)
        {
            return NotFound();
        }

        return await datasets.GetAllForRevisionAsync(context.RevisionId);
    }

    [HttpPost("~/api/reports/{reportId:int}/datasets")]
    [AuthorizeReport(AccessLevel.Editor)]
    public async Task<ActionResult<DatasetSummaryDto>> Create(int reportId, CreateDatasetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("A dataset needs a name.");
        }

        var context = await datasets.GetDraftContextAsync(reportId);
        if (context is null)
        {
            return NotFound();
        }

        var dataset = await datasets.CreateAsync(context.RevisionId, dto.Name.Trim(), dto.SourceId);
        if (dataset is null)
        {
            return BadRequest("Unknown dataset source.");
        }

        return CreatedAtAction(nameof(GetSchema), new { id = dataset.Id }, dataset);
    }

    [HttpGet("{id:int}/schema")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<DatasetSchemaDto>> GetSchema(int id)
    {
        var schema = await datasets.GetSchemaAsync(id);
        return schema is null ? NotFound() : schema;
    }

    [HttpPut("{id:int}")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetSummaryDto>> Rename(int id, SaveDatasetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("A dataset needs a name.");
        }

        var dataset = await datasets.RenameAsync(id, dto.Name.Trim());
        return dataset is null ? NotFound() : dataset;
    }

    [HttpPost("{id:int}/clone")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetSummaryDto>> Clone(int id, SaveDatasetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("A dataset needs a name.");
        }

        var dataset = await datasets.CloneAsync(id, dto.Name.Trim());
        return dataset is null ? NotFound() : CreatedAtAction(nameof(GetSchema), new { id = dataset.Id }, dataset);
    }

    [HttpDelete("{id:int}")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<IActionResult> Delete(int id)
    {
        return await datasets.DeleteAsync(id) ? NoContent() : NotFound();
    }

    /// <summary>The configuration resets to the new source's default.</summary>
    [HttpPut("{id:int}/source")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetSchemaDto>> SetSource(int id, SetDatasetSourceDto dto)
    {
        var schema = await datasets.SetSourceAsync(id, dto.SourceId);
        return schema is null ? NotFound() : schema;
    }

    /// <summary>The body's source must match the dataset's.</summary>
    [HttpPut("{id:int}/source-config")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetSchemaDto>> UpdateSourceConfig(int id, DatasetSourceConfig config)
    {
        var schema = await datasets.UpdateSourceConfigAsync(id, config);
        return schema is null ? NotFound() : schema;
    }
}
