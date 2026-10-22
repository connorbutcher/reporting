using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/datasets")]
public class DatasetColumnsController(DatasetRepository datasets, DatasetColumnUsageService columnUsage) : ControllerBase
{
    /// <summary>
    /// The widgets and page filters that removing a column would break. Editor-level: it names the
    /// draft's widgets, and only an editor can remove a column.
    /// </summary>
    [HttpGet("{id:int}/column-usage")]
    [AuthorizeDataset(AccessLevel.Editor)]
    public async Task<ActionResult<DatasetColumnUsageDto>> GetColumnUsage(int id)
    {
        var usage = await columnUsage.GetAsync(id);
        return usage is null ? NotFound() : usage;
    }

    /// <summary>What changing a column to <paramref name="type"/> would newly break.</summary>
    [HttpGet("{id:int}/columns/{columnId:guid}/type-impact")]
    [AuthorizeDataset(AccessLevel.Editor)]
    public async Task<ActionResult<ColumnTypeImpactDto>> GetColumnTypeImpact(int id, Guid columnId, DatasetColumnType type)
    {
        var impact = await columnUsage.GetTypeChangeImpactAsync(id, columnId, type);
        return impact is null ? NotFound() : impact;
    }

    /// <summary>A column's distinct values for the filter dropdowns. Ordered and capped; <paramref name="search"/> narrows for type-ahead.</summary>
    [HttpGet("{id:int}/columns/{columnId:guid}/values")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<List<string>>> GetColumnValues(
        int id,
        Guid columnId,
        string? search = null,
        int limit = 50)
    {
        var values = await datasets.GetColumnValuesAsync(id, columnId, search, limit);
        return values is null ? NotFound() : values;
    }

    /// <summary>The body's kind must match the column's type.</summary>
    [HttpPut("{id:int}/columns/{columnId:guid}/configuration")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetColumnDto>> UpdateColumnConfiguration(
        int id,
        Guid columnId,
        [FromBody] DatasetColumnConfig configuration)
    {
        var column = await datasets.UpdateColumnConfigurationAsync(id, columnId, configuration);
        return column is null ? NotFound() : column;
    }

    [HttpPost("{id:int}/columns")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetColumnDto>> AddColumn(int id, SaveDatasetColumnDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("A column needs a name.");
        }

        var column = await datasets.AddColumnAsync(id, dto.Name.Trim(), dto.Type);
        return column is null ? NotFound() : column;
    }

    [HttpPut("{id:int}/columns/{columnId:guid}")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetColumnDto>> UpdateColumn(
        int id,
        Guid columnId,
        SaveDatasetColumnDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("A column needs a name.");
        }

        var column = await datasets.UpdateColumnAsync(id, columnId, dto.Name.Trim(), dto.Type);
        return column is null ? NotFound() : column;
    }

    [HttpDelete("{id:int}/columns/{columnId:guid}")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<IActionResult> DeleteColumn(int id, Guid columnId)
    {
        return await datasets.DeleteColumnAsync(id, columnId) ? NoContent() : NotFound();
    }

    [HttpPut("{id:int}/columns/order")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetSchemaDto>> ReorderColumns(int id, ReorderColumnsDto dto)
    {
        var schema = await datasets.ReorderColumnsAsync(id, dto.ColumnIds);
        return schema is null ? NotFound() : schema;
    }
}
