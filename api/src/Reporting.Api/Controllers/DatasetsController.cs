using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.DAL.Permissions;
using Reporting.DAL.Repositories;
using Reporting.DAL.Widgets;

namespace Reporting.Api.Controllers;

/// <summary>
/// Datasets belong to a report revision. List and create are scoped to a report's checked-out draft;
/// every other operation addresses a dataset by its primary key and is authorized against the report
/// that owns it — Viewer to read/query, Editor to mutate, and mutations are refused on the immutable
/// data of a published version.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class DatasetsController(
    DatasetRepository datasets,
    DatasetRowRepository rows,
    WidgetQueryRepository widgetQueries,
    PermissionService permissions) : ControllerBase
{
    // --- report-scoped list & create (the draft revision) ---------------------

    [HttpGet("~/api/reports/{reportId:int}/datasets")]
    public async Task<ActionResult<List<DatasetSummaryDto>>> GetForReport(int reportId)
    {
        var context = await datasets.GetDraftContextAsync(reportId);
        if (context is null) return NotFound();
        if (await LevelForAsync(context.FolderId, context.InheritsPermissions, reportId) < AccessLevel.Viewer)
            return NotFound();

        return await datasets.GetAllForRevisionAsync(context.RevisionId);
    }

    [HttpPost("~/api/reports/{reportId:int}/datasets")]
    public async Task<ActionResult<DatasetSummaryDto>> Create(int reportId, SaveDatasetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A dataset needs a name.");

        var context = await datasets.GetDraftContextAsync(reportId);
        if (context is null) return NotFound();
        var level = await LevelForAsync(context.FolderId, context.InheritsPermissions, reportId);
        if (level < AccessLevel.Viewer) return NotFound();
        if (level < AccessLevel.Editor) return StatusCode(StatusCodes.Status403Forbidden);

        var dataset = await datasets.CreateAsync(context.RevisionId, dto.Name.Trim());
        return CreatedAtAction(nameof(GetSchema), new { id = dataset.Id }, dataset);
    }

    // --- reads (Viewer) -------------------------------------------------------

    [HttpGet("{id:int}/schema")]
    public async Task<ActionResult<DatasetSchemaDto>> GetSchema(int id)
    {
        if (await GuardAsync(id, AccessLevel.Viewer) is { } denied) return denied;

        var schema = await datasets.GetSchemaAsync(id);
        return schema is null ? NotFound() : schema;
    }

    [HttpGet("{id:int}/data")]
    public async Task<ActionResult<DatasetDataDto>> GetData(int id)
    {
        if (await GuardAsync(id, AccessLevel.Viewer) is { } denied) return denied;

        var data = await rows.GetDataAsync(id);
        return data is null ? NotFound() : data;
    }

    /// <summary>
    /// The rows matching a filter. POST rather than GET because the filter is a
    /// tree; filtering runs in SQL so a widget never pulls rows it won't show.
    /// </summary>
    [HttpPost("{id:int}/query")]
    public async Task<ActionResult<DatasetQueryResultDto>> Query(int id, DatasetQueryDto dto)
    {
        if (await GuardAsync(id, AccessLevel.Viewer) is { } denied) return denied;

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
    [HttpPost("{id:int}/table-query")]
    public async Task<ActionResult<TableQueryResultDto>> TableQuery(int id, TableQueryDto dto)
    {
        if (await GuardAsync(id, AccessLevel.Viewer) is { } denied) return denied;

        try
        {
            var result = await widgetQueries.QueryForTableAsync(id, dto);
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
    [HttpPost("{id:int}/chart-query")]
    public async Task<ActionResult<ChartQueryResultDto>> ChartQuery(int id, ChartQueryDto dto)
    {
        if (await GuardAsync(id, AccessLevel.Viewer) is { } denied) return denied;

        try
        {
            var result = await widgetQueries.QueryForChartAsync(id, dto);
            return result is null ? NotFound() : result;
        }
        catch (FilterException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Rows shaped for a bar chart: filtered, grouped by the category column, and
    /// reduced to one value per category (per series) by the chosen aggregate.
    /// </summary>
    [HttpPost("{id:int}/bar-chart-query")]
    public async Task<ActionResult<BarChartQueryResultDto>> BarChartQuery(int id, BarChartQueryDto dto)
    {
        if (await GuardAsync(id, AccessLevel.Viewer) is { } denied) return denied;

        try
        {
            var result = await widgetQueries.QueryForBarChartAsync(id, dto);
            return result is null ? NotFound() : result;
        }
        catch (FilterException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // --- mutations (Editor, draft only) ---------------------------------------

    /// <summary>Replaces a column's free-form display configuration blob.</summary>
    [HttpPut("{id:int}/columns/{columnId:guid}/configuration")]
    public async Task<ActionResult<DatasetColumnDto>> UpdateColumnConfiguration(
        int id,
        Guid columnId,
        [FromBody] JsonElement configuration)
    {
        if (await GuardAsync(id, AccessLevel.Editor, mutation: true) is { } denied) return denied;

        try
        {
            var column = await datasets.UpdateColumnConfigurationAsync(id, columnId, configuration);
            return column is null ? NotFound() : column;
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<DatasetSummaryDto>> Rename(int id, SaveDatasetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A dataset needs a name.");
        if (await GuardAsync(id, AccessLevel.Editor, mutation: true) is { } denied) return denied;

        var dataset = await datasets.RenameAsync(id, dto.Name.Trim());
        return dataset is null ? NotFound() : dataset;
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (await GuardAsync(id, AccessLevel.Editor, mutation: true) is { } denied) return denied;
        return await datasets.DeleteAsync(id) ? NoContent() : NotFound();
    }

    // --- columns --------------------------------------------------------------

    [HttpPost("{id:int}/columns")]
    public async Task<ActionResult<DatasetColumnDto>> AddColumn(int id, SaveDatasetColumnDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A column needs a name.");
        if (await GuardAsync(id, AccessLevel.Editor, mutation: true) is { } denied) return denied;

        var column = await datasets.AddColumnAsync(id, dto.Name.Trim(), dto.Type);
        return column is null ? NotFound() : column;
    }

    [HttpPut("{id:int}/columns/{columnId:guid}")]
    public async Task<ActionResult<DatasetColumnDto>> UpdateColumn(
        int id,
        Guid columnId,
        SaveDatasetColumnDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A column needs a name.");
        if (await GuardAsync(id, AccessLevel.Editor, mutation: true) is { } denied) return denied;

        var column = await datasets.UpdateColumnAsync(id, columnId, dto.Name.Trim(), dto.Type);
        return column is null ? NotFound() : column;
    }

    [HttpDelete("{id:int}/columns/{columnId:guid}")]
    public async Task<IActionResult> DeleteColumn(int id, Guid columnId)
    {
        if (await GuardAsync(id, AccessLevel.Editor, mutation: true) is { } denied) return denied;
        return await datasets.DeleteColumnAsync(id, columnId) ? NoContent() : NotFound();
    }

    [HttpPut("{id:int}/columns/order")]
    public async Task<ActionResult<DatasetSchemaDto>> ReorderColumns(int id, ReorderColumnsDto dto)
    {
        if (await GuardAsync(id, AccessLevel.Editor, mutation: true) is { } denied) return denied;

        var schema = await datasets.ReorderColumnsAsync(id, dto.ColumnIds);
        return schema is null ? NotFound() : schema;
    }

    // --- rows -----------------------------------------------------------------

    [HttpPost("{id:int}/rows")]
    public async Task<ActionResult<DatasetRowDto>> AddRow(int id, SaveDatasetRowDto dto)
    {
        if (await GuardAsync(id, AccessLevel.Editor, mutation: true) is { } denied) return denied;

        var row = await rows.AddRowAsync(id, dto.Values);
        return row is null ? NotFound() : row;
    }

    [HttpPut("{id:int}/rows/{rowId:guid}")]
    public async Task<ActionResult<DatasetRowDto>> UpdateRow(int id, Guid rowId, SaveDatasetRowDto dto)
    {
        if (await GuardAsync(id, AccessLevel.Editor, mutation: true) is { } denied) return denied;

        var row = await rows.UpdateRowAsync(id, rowId, dto.Values);
        return row is null ? NotFound() : row;
    }

    [HttpDelete("{id:int}/rows/{rowId:guid}")]
    public async Task<IActionResult> DeleteRow(int id, Guid rowId)
    {
        if (await GuardAsync(id, AccessLevel.Editor, mutation: true) is { } denied) return denied;
        return await rows.DeleteRowAsync(id, rowId) ? NoContent() : NotFound();
    }

    // --- authorization --------------------------------------------------------

    /// <summary>
    /// Authorizes an operation on a dataset against the report that owns it: a dataset the caller
    /// can't see (or that doesn't exist) is a 404, one below the required level is a 403, and a
    /// mutation against a published version's immutable data is a 400. Null means "go ahead".
    /// </summary>
    private async Task<ActionResult?> GuardAsync(int datasetId, AccessLevel required, bool mutation = false)
    {
        var owner = await datasets.GetOwnerAsync(datasetId);
        if (owner is null) return NotFound();

        var level = await LevelForAsync(owner.FolderId, owner.InheritsPermissions, owner.ReportId);
        if (level < AccessLevel.Viewer) return NotFound();
        if (level < required) return StatusCode(StatusCodes.Status403Forbidden);
        if (mutation && !owner.IsDraft) return BadRequest("This report version's data is read-only.");
        return null;
    }

    private Task<AccessLevel> LevelForAsync(int? folderId, bool inheritsPermissions, int reportId) =>
        permissions.LevelForReportAsync(reportId, folderId, inheritsPermissions);
}
