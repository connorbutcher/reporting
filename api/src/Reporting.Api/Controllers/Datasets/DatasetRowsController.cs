using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/datasets")]
public class DatasetRowsController(DatasetRowRepository rows) : ControllerBase
{
    [HttpGet("{id:int}/data")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<DatasetDataDto>> GetData(int id)
    {
        var data = await rows.GetDataAsync(id);
        return data is null ? NotFound() : data;
    }

    /// <summary>A window of rows for the editor grid's virtual scroll, plus the total row count.</summary>
    [HttpGet("{id:int}/rows")]
    [AuthorizeDataset(AccessLevel.Viewer)]
    public async Task<ActionResult<DatasetRowWindowDto>> GetRowWindow(int id, int first = 0, int count = 100)
    {
        var window = await rows.GetRowWindowAsync(id, first, count);
        return window is null ? NotFound() : window;
    }

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
    public async Task<IActionResult> DeleteRow(int id, Guid rowId)
    {
        return await rows.DeleteRowAsync(id, rowId) ? NoContent() : NotFound();
    }
}
