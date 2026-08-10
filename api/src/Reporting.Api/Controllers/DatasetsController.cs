using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DatasetsController(DatasetRepository datasets) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<DatasetSummaryDto>>> GetAll() =>
        await datasets.GetAllAsync();

    [HttpGet("{id:guid}/schema")]
    public async Task<ActionResult<DatasetSchemaDto>> GetSchema(Guid id)
    {
        var schema = await datasets.GetSchemaAsync(id);
        return schema is null ? NotFound() : schema;
    }

    [HttpGet("{id:guid}/data")]
    public async Task<ActionResult<DatasetDataDto>> GetData(Guid id)
    {
        var data = await datasets.GetDataAsync(id);
        return data is null ? NotFound() : data;
    }

    /// <summary>
    /// The rows matching a filter. POST rather than GET because the filter is a
    /// tree; filtering runs in SQL so a widget never pulls rows it won't show.
    /// </summary>
    [HttpPost("{id:guid}/query")]
    public async Task<ActionResult<DatasetQueryResultDto>> Query(Guid id, DatasetQueryDto dto)
    {
        try
        {
            var result = await datasets.QueryAsync(id, dto.Filter);
            return result is null ? NotFound() : result;
        }
        catch (FilterException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// A page of rows shaped for a table widget: filtered, sorted, and paged
    /// server-side, with each cell already formatted and tolerance-classified.
    /// </summary>
    [HttpPost("{id:guid}/table-query")]
    public async Task<ActionResult<TableQueryResultDto>> TableQuery(Guid id, TableQueryDto dto)
    {
        try
        {
            var result = await datasets.QueryForTableAsync(id, dto);
            return result is null ? NotFound() : result;
        }
        catch (FilterException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Rows shaped for a chart widget: filtered, grouped into series, with
    /// tolerance bounds resolved and tooltip lines pre-formatted.
    /// </summary>
    [HttpPost("{id:guid}/chart-query")]
    public async Task<ActionResult<ChartQueryResultDto>> ChartQuery(Guid id, ChartQueryDto dto)
    {
        try
        {
            var result = await datasets.QueryForChartAsync(id, dto);
            return result is null ? NotFound() : result;
        }
        catch (FilterException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>Replaces a column's free-form display configuration blob.</summary>
    [HttpPut("{id:guid}/columns/{columnId:guid}/configuration")]
    public async Task<ActionResult<DatasetColumnDto>> UpdateColumnConfiguration(
        Guid id,
        Guid columnId,
        [FromBody] JsonElement configuration)
    {
        if (configuration.ValueKind is not (JsonValueKind.Object or JsonValueKind.Null or JsonValueKind.Undefined))
        {
            return BadRequest("Column configuration must be a JSON object.");
        }

        var configurationJson = configuration.ValueKind == JsonValueKind.Object
            ? configuration.GetRawText()
            : "{}";

        var column = await datasets.UpdateColumnConfigurationAsync(id, columnId, configurationJson);
        return column is null ? NotFound() : column;
    }

    // --- dataset management ---------------------------------------------------

    [HttpPost]
    public async Task<ActionResult<DatasetSummaryDto>> Create(SaveDatasetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A dataset needs a name.");

        var dataset = await datasets.CreateAsync(dto.Name.Trim());
        return CreatedAtAction(nameof(GetSchema), new { id = dataset.Id }, dataset);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DatasetSummaryDto>> Rename(Guid id, SaveDatasetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A dataset needs a name.");

        var dataset = await datasets.RenameAsync(id, dto.Name.Trim());
        return dataset is null ? NotFound() : dataset;
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) =>
        await datasets.DeleteAsync(id) ? NoContent() : NotFound();

    // --- columns --------------------------------------------------------------

    [HttpPost("{id:guid}/columns")]
    public async Task<ActionResult<DatasetColumnDto>> AddColumn(Guid id, SaveDatasetColumnDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A column needs a name.");

        var column = await datasets.AddColumnAsync(id, dto.Name.Trim(), dto.Type);
        return column is null ? NotFound() : column;
    }

    [HttpPut("{id:guid}/columns/{columnId:guid}")]
    public async Task<ActionResult<DatasetColumnDto>> UpdateColumn(
        Guid id,
        Guid columnId,
        SaveDatasetColumnDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A column needs a name.");

        var column = await datasets.UpdateColumnAsync(id, columnId, dto.Name.Trim(), dto.Type);
        return column is null ? NotFound() : column;
    }

    [HttpDelete("{id:guid}/columns/{columnId:guid}")]
    public async Task<IActionResult> DeleteColumn(Guid id, Guid columnId) =>
        await datasets.DeleteColumnAsync(id, columnId) ? NoContent() : NotFound();

    [HttpPut("{id:guid}/columns/order")]
    public async Task<ActionResult<DatasetSchemaDto>> ReorderColumns(Guid id, ReorderColumnsDto dto)
    {
        var schema = await datasets.ReorderColumnsAsync(id, dto.ColumnIds);
        return schema is null ? NotFound() : schema;
    }

    // --- rows -----------------------------------------------------------------

    [HttpPost("{id:guid}/rows")]
    public async Task<ActionResult<DatasetRowDto>> AddRow(Guid id, SaveDatasetRowDto dto)
    {
        var row = await datasets.AddRowAsync(id, dto.Values);
        return row is null ? NotFound() : row;
    }

    [HttpPut("{id:guid}/rows/{rowId:guid}")]
    public async Task<ActionResult<DatasetRowDto>> UpdateRow(Guid id, Guid rowId, SaveDatasetRowDto dto)
    {
        var row = await datasets.UpdateRowAsync(id, rowId, dto.Values);
        return row is null ? NotFound() : row;
    }

    [HttpDelete("{id:guid}/rows/{rowId:guid}")]
    public async Task<IActionResult> DeleteRow(Guid id, Guid rowId) =>
        await datasets.DeleteRowAsync(id, rowId) ? NoContent() : NotFound();
}
