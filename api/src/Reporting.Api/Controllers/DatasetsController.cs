using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL.Filtering;
using Reporting.DAL.Repositories;
using Reporting.DAL.Widgets;

namespace Reporting.Api.Controllers;

/// <summary>
/// Datasets belong to a report revision. List and create are scoped to a report's checked-out draft;
/// every other operation addresses a dataset by its primary key and is authorized against the report
/// that owns it — Viewer to read/query, Editor to mutate, and mutations are refused on the immutable
/// data of a published version. Authorization is declared per action with <c>[AuthorizeReport]</c> /
/// <c>[AuthorizeDataset]</c>, which resolve against the one <see cref="ResourceAuthorizer"/> at the edge.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class DatasetsController(
    DatasetRepository datasets,
    DatasetRowRepository rows,
    WidgetQueryRepository widgetQueries) : ControllerBase
{
    // --- source reference data ------------------------------------------------

    /// <summary>The fixed set of source systems a dataset can draw from, for the source pickers.</summary>
    [HttpGet("~/api/dataset-sources")]
    public Task<List<DatasetSourceDto>> GetSources() => datasets.GetSourcesAsync();

    // --- report-scoped list & create (the draft revision) ---------------------

    [HttpGet("~/api/reports/{reportId:int}/datasets")]
    [AuthorizeReport(AccessLevel.Viewer)]
    public async Task<ActionResult<List<DatasetSummaryDto>>> GetForReport(int reportId)
    {
        var context = await datasets.GetDraftContextAsync(reportId);
        if (context is null) return NotFound();
        return await datasets.GetAllForRevisionAsync(context.RevisionId);
    }

    [HttpPost("~/api/reports/{reportId:int}/datasets")]
    [AuthorizeReport(AccessLevel.Editor)]
    public async Task<ActionResult<DatasetSummaryDto>> Create(int reportId, CreateDatasetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A dataset needs a name.");

        var context = await datasets.GetDraftContextAsync(reportId);
        if (context is null) return NotFound();

        var dataset = await datasets.CreateAsync(context.RevisionId, dto.Name.Trim(), dto.SourceId);
        if (dataset is null) return BadRequest("Unknown dataset source.");
        return CreatedAtAction(nameof(GetSchema), new { id = dataset.Id }, dataset);
    }

    // --- reads (Viewer) -------------------------------------------------------

    [HttpGet("{id:int}/schema")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<DatasetSchemaDto>> GetSchema(int id)
    {
        var schema = await datasets.GetSchemaAsync(id);
        return schema is null ? NotFound() : schema;
    }

    [HttpGet("{id:int}/data")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<DatasetDataDto>> GetData(int id)
    {
        var data = await rows.GetDataAsync(id);
        return data is null ? NotFound() : data;
    }

    /// <summary>
    /// A window of the dataset's rows for the editor grid's lazy virtual scroll:
    /// <paramref name="count"/> rows starting at <paramref name="first"/>, plus the
    /// total row count. Keeps a large dataset from loading into the editor at once.
    /// </summary>
    [HttpGet("{id:int}/rows")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<DatasetRowWindowDto>> GetRowWindow(int id, int first = 0, int count = 100)
    {
        var window = await rows.GetRowWindowAsync(id, first, count);
        return window is null ? NotFound() : window;
    }

    /// <summary>
    /// The rows matching a filter. POST rather than GET because the filter is a
    /// tree; filtering runs in SQL so a widget never pulls rows it won't show.
    /// </summary>
    [HttpPost("{id:int}/query")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<DatasetQueryResultDto>> Query(int id, DatasetQueryDto dto)
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
    [HttpPost("{id:int}/table-query")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<TableQueryResultDto>> TableQuery(int id, TableQueryDto dto)
    {
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
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<ChartQueryResultDto>> ChartQuery(int id, ChartQueryDto dto)
    {
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
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<BarChartQueryResultDto>> BarChartQuery(int id, BarChartQueryDto dto)
    {
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
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<BoxPlotQueryResultDto>> BoxPlotQuery(int id, BoxPlotQueryDto dto)
    {
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

    /// <summary>
    /// Rows shaped for a pivot / aggregation table: filtered, grouped by the row-dimension columns,
    /// and each group reduced to one value per measure by that measure's aggregate.
    /// </summary>
    [HttpPost("{id:int}/pivot-query")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<PivotQueryResultDto>> PivotQuery(int id, PivotQueryDto dto)
    {
        try
        {
            var result = await widgetQueries.QueryForPivotAsync(id, dto);
            return result is null ? NotFound() : result;
        }
        catch (FilterException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Values shaped for a histogram: filtered, then the chosen numeric column's values binned into
    /// equal ranges with each bin's frequency returned as a bar height.
    /// </summary>
    [HttpPost("{id:int}/histogram-query")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<HistogramQueryResultDto>> HistogramQuery(int id, HistogramQueryDto dto)
    {
        try
        {
            var result = await widgetQueries.QueryForHistogramAsync(id, dto);
            return result is null ? NotFound() : result;
        }
        catch (FilterException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// The distinct values a column holds, for the filter panel's value dropdowns — so a reader
    /// filtering a column like "shift" picks from its real day/night values instead of typing.
    /// Ordered and capped; <paramref name="search"/> narrows to matching values for type-ahead.
    /// </summary>
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

    // --- mutations (Editor, draft only) ---------------------------------------

    /// <summary>Replaces a column's typed display configuration; the body's kind must match the column's type.</summary>
    [HttpPut("{id:int}/columns/{columnId:guid}/configuration")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetColumnDto>> UpdateColumnConfiguration(
        int id,
        Guid columnId,
        [FromBody] DatasetColumnConfig configuration)
    {
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
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetSummaryDto>> Rename(int id, SaveDatasetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A dataset needs a name.");

        var dataset = await datasets.RenameAsync(id, dto.Name.Trim());
        return dataset is null ? NotFound() : dataset;
    }

    /// <summary>Deep-copies a dataset within its report's draft, under a caller-supplied name.</summary>
    [HttpPost("{id:int}/clone")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetSummaryDto>> Clone(int id, SaveDatasetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A dataset needs a name.");

        var dataset = await datasets.CloneAsync(id, dto.Name.Trim());
        return dataset is null ? NotFound() : CreatedAtAction(nameof(GetSchema), new { id = dataset.Id }, dataset);
    }

    [HttpDelete("{id:int}")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<IActionResult> Delete(int id) =>
        await datasets.DeleteAsync(id) ? NoContent() : NotFound();

    // --- source & source configuration ----------------------------------------

    /// <summary>Repoints a dataset at a different source; its configuration resets to that source's default.</summary>
    [HttpPut("{id:int}/source")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetSchemaDto>> SetSource(int id, SetDatasetSourceDto dto)
    {
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
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetSchemaDto>> UpdateSourceConfig(int id, DatasetSourceConfig config)
    {
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
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetColumnDto>> AddColumn(int id, SaveDatasetColumnDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A column needs a name.");

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
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A column needs a name.");

        var column = await datasets.UpdateColumnAsync(id, columnId, dto.Name.Trim(), dto.Type);
        return column is null ? NotFound() : column;
    }

    [HttpDelete("{id:int}/columns/{columnId:guid}")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<IActionResult> DeleteColumn(int id, Guid columnId) =>
        await datasets.DeleteColumnAsync(id, columnId) ? NoContent() : NotFound();

    [HttpPut("{id:int}/columns/order")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetSchemaDto>> ReorderColumns(int id, ReorderColumnsDto dto)
    {
        var schema = await datasets.ReorderColumnsAsync(id, dto.ColumnIds);
        return schema is null ? NotFound() : schema;
    }

    // --- rows -----------------------------------------------------------------

    [HttpPost("{id:int}/rows")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetRowDto>> AddRow(int id, SaveDatasetRowDto dto)
    {
        var row = await rows.AddRowAsync(id, dto.Values);
        return row is null ? NotFound() : row;
    }

    [HttpPut("{id:int}/rows/{rowId:guid}")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetRowDto>> UpdateRow(int id, Guid rowId, SaveDatasetRowDto dto)
    {
        var row = await rows.UpdateRowAsync(id, rowId, dto.Values);
        return row is null ? NotFound() : row;
    }

    [HttpDelete("{id:int}/rows/{rowId:guid}")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<IActionResult> DeleteRow(int id, Guid rowId) =>
        await rows.DeleteRowAsync(id, rowId) ? NoContent() : NotFound();
}
