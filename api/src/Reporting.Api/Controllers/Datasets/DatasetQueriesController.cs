using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL.Repositories;
using Reporting.DAL.Widgets;

namespace Reporting.Api.Controllers;

/// <summary>
/// Filtered reads shaped for each widget type. POST because the filter is a tree; filtering runs in
/// SQL so a widget never pulls rows it won't show.
/// </summary>
[ApiController]
[Route("api/datasets")]
public class DatasetQueriesController(
    DatasetRepository datasets,
    TableQueryService tableQueries,
    ChartQueryService chartQueries,
    BarChartQueryService barChartQueries,
    BoxPlotQueryService boxPlotQueries,
    XBarRChartQueryService xBarRChartQueries,
    PivotQueryService pivotQueries,
    HistogramQueryService histogramQueries,
    KpiQueryService kpiQueries) : ControllerBase
{
    [HttpPost("{id:int}/query")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<DatasetQueryResultDto>> Query(int id, DatasetQueryDto dto)
    {
        var result = await datasets.QueryAsync(id, dto.Filter);
        return result is null ? NotFound() : result;
    }

    /// <summary>Counts only, for the filter panel's "matches N of M" readout.</summary>
    [HttpPost("{id:int}/count")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<DatasetCountResultDto>> Count(int id, DatasetQueryDto dto)
    {
        var result = await datasets.CountAsync(id, dto.Filter);
        return result is null ? NotFound() : result;
    }

    [HttpPost("{id:int}/table-query")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<TableQueryResultDto>> TableQuery(int id, TableQueryDto dto)
    {
        var result = await tableQueries.QueryForTableAsync(id, dto);
        return result is null ? NotFound() : result;
    }

    /// <summary>Every matched row from the first, for a CSV export. Capped at <see cref="TableQueryService.MaxExportRows"/>.</summary>
    [HttpPost("{id:int}/table-export")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<TableQueryResultDto>> TableExport(int id, TableQueryDto dto)
    {
        var result = await tableQueries.QueryForTableExportAsync(id, dto);
        return result is null ? NotFound() : result;
    }

    [HttpPost("{id:int}/chart-query")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<ChartQueryResultDto>> ChartQuery(int id, ChartQueryDto dto)
    {
        var result = await chartQueries.QueryForChartAsync(id, dto);
        return result is null ? NotFound() : result;
    }

    [HttpPost("{id:int}/bar-chart-query")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<BarChartQueryResultDto>> BarChartQuery(int id, BarChartQueryDto dto)
    {
        var result = await barChartQueries.QueryForBarChartAsync(id, dto);
        return result is null ? NotFound() : result;
    }

    [HttpPost("{id:int}/box-plot-query")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<BoxPlotQueryResultDto>> BoxPlotQuery(int id, BoxPlotQueryDto dto)
    {
        var result = await boxPlotQueries.QueryForBoxPlotAsync(id, dto);
        return result is null ? NotFound() : result;
    }

    [HttpPost("{id:int}/xbar-r-chart-query")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<XBarRChartQueryResultDto>> XBarRChartQuery(int id, XBarRChartQueryDto dto)
    {
        var result = await xBarRChartQueries.QueryForXBarRChartAsync(id, dto);
        return result is null ? NotFound() : result;
    }

    [HttpPost("{id:int}/pivot-query")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<PivotQueryResultDto>> PivotQuery(int id, PivotQueryDto dto)
    {
        var result = await pivotQueries.QueryForPivotAsync(id, dto);
        return result is null ? NotFound() : result;
    }

    [HttpPost("{id:int}/histogram-query")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<HistogramQueryResultDto>> HistogramQuery(int id, HistogramQueryDto dto)
    {
        var result = await histogramQueries.QueryForHistogramAsync(id, dto);
        return result is null ? NotFound() : result;
    }

    [HttpPost("{id:int}/kpi-query")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<KpiQueryResultDto>> KpiQuery(int id, KpiQueryDto dto)
    {
        var result = await kpiQueries.QueryForKpiAsync(id, dto);
        return result is null ? NotFound() : result;
    }
}
