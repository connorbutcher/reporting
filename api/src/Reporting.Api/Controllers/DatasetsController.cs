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
    // --- source reference data ------------------------------------------------

    /// <summary>The fixed set of source systems a dataset can draw from, for the source pickers.</summary>
    [HttpGet("~/api/dataset-sources")]
    public Task<List<DatasetSourceDto>> GetSources() => datasets.GetSourcesAsync();

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
    public async Task<ActionResult<DatasetSummaryDto>> Create(int reportId, CreateDatasetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A dataset needs a name.");

        var context = await datasets.GetDraftContextAsync(reportId);
        if (context is null) return NotFound();
        var level = await LevelForAsync(context.FolderId, context.InheritsPermissions, reportId);
        if (level < AccessLevel.Viewer) return NotFound();
        if (level < AccessLevel.Editor) return StatusCode(StatusCodes.Status403Forbidden);

        var dataset = await datasets.CreateAsync(context.RevisionId, dto.Name.Trim(), dto.SourceId);
        if (dataset is null) return BadRequest("Unknown dataset source.");
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
    /// A window of the dataset's rows for the editor grid's lazy virtual scroll:
    /// <paramref name="count"/> rows starting at <paramref name="first"/>, plus the
    /// total row count. Keeps a large dataset from loading into the editor at once.
    /// </summary>
    [HttpGet("{id:int}/rows")]
    public async Task<ActionResult<DatasetRowWindowDto>> GetRowWindow(int id, int first = 0, int count = 100)
    {
        if (await GuardAsync(id, AccessLevel.Viewer) is { } denied) return denied;

        var window = await rows.GetRowWindowAsync(id, first, count);
        return window is null ? NotFound() : window;
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

    /// <summary>
    /// Rows shaped for a box-and-whisker chart: filtered, grouped by the category column,
    /// and each group's measure values reduced to a five-number summary (with outliers).
    /// </summary>
    [HttpPost("{id:int}/box-plot-query")]
    public async Task<ActionResult<BoxPlotQueryResultDto>> BoxPlotQuery(int id, BoxPlotQueryDto dto)
    {
        if (await GuardAsync(id, AccessLevel.Viewer) is { } denied) return denied;

        try
        {
            var result = await widgetQueries.QueryForBoxPlotAsync(id, dto);
            return result is null ? NotFound() : result;
        }
        catch (FilterException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // --- mutations (Editor, draft only) ---------------------------------------

    /// <summary>Replaces a column's typed display configuration; the body's kind must match the column's type.</summary>
    [HttpPut("{id:int}/columns/{columnId:guid}/configuration")]
    public async Task<ActionResult<DatasetColumnDto>> UpdateColumnConfiguration(
        int id,
        Guid columnId,
        [FromBody] DatasetColumnConfig configuration)
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

    /// <summary>Deep-copies a dataset within its report's draft, under a caller-supplied name.</summary>
    [HttpPost("{id:int}/clone")]
    public async Task<ActionResult<DatasetSummaryDto>> Clone(int id, SaveDatasetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A dataset needs a name.");
        if (await GuardAsync(id, AccessLevel.Editor, mutation: true) is { } denied) return denied;

        var dataset = await datasets.CloneAsync(id, dto.Name.Trim());
        return dataset is null ? NotFound() : CreatedAtAction(nameof(GetSchema), new { id = dataset.Id }, dataset);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (await GuardAsync(id, AccessLevel.Editor, mutation: true) is { } denied) return denied;
        return await datasets.DeleteAsync(id) ? NoContent() : NotFound();
    }

    // --- source & source configuration ----------------------------------------

    /// <summary>Repoints a dataset at a different source; its configuration resets to that source's default.</summary>
    [HttpPut("{id:int}/source")]
    public async Task<ActionResult<DatasetSchemaDto>> SetSource(int id, SetDatasetSourceDto dto)
    {
        if (await GuardAsync(id, AccessLevel.Editor, mutation: true) is { } denied) return denied;

        try
        {
            var schema = await datasets.SetSourceAsync(id, dto.SourceId);
            return schema is null ? NotFound() : schema;
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>Replaces a dataset's source configuration. The body's source must match the dataset's.</summary>
    [HttpPut("{id:int}/source-config")]
    public async Task<ActionResult<DatasetSchemaDto>> UpdateSourceConfig(int id, DatasetSourceConfig config)
    {
        if (await GuardAsync(id, AccessLevel.Editor, mutation: true) is { } denied) return denied;

        try
        {
            var schema = await datasets.UpdateSourceConfigAsync(id, config);
            return schema is null ? NotFound() : schema;
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
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
