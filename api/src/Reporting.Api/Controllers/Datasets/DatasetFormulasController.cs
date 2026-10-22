using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

/// <summary>Computed columns: checked against the dataset and the function catalogue, then evaluated server-side for every row.</summary>
[ApiController]
[Route("api/datasets")]
public class DatasetFormulasController(DatasetFormulaRepository formulaColumns) : ControllerBase
{
    [HttpPost("{id:int}/columns/formula")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetColumnDto>> AddFormulaColumn(int id, SaveFormulaColumnDto dto)
    {
        var column = await formulaColumns.AddAsync(id, dto);
        return column is null ? NotFound() : column;
    }

    [HttpPut("{id:int}/columns/{columnId:guid}/formula")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetColumnDto>> UpdateFormulaColumn(int id, Guid columnId, SaveFormulaColumnDto dto)
    {
        var column = await formulaColumns.UpdateAsync(id, columnId, dto);
        return column is null ? NotFound() : column;
    }

    /// <summary>
    /// Checks an unsaved formula against a sample of rows, changing nothing. Problems come back as
    /// structured errors, not a failed request.
    /// </summary>
    [HttpPost("{id:int}/formula/preview")]
    [AuthorizeDataset(AccessLevel.Editor)]
    public async Task<ActionResult<FormulaPreviewDto>> PreviewFormula(int id, FormulaPreviewRequestDto dto)
    {
        var preview = await formulaColumns.PreviewAsync(id, dto);
        return preview is null ? NotFound() : preview;
    }

    /// <summary>Recomputes every formula column, for after the function catalogue changed.</summary>
    [HttpPost("{id:int}/formula/recalculate")]
    [AuthorizeDataset(AccessLevel.Editor, Mutation = true)]
    public async Task<ActionResult<DatasetSchemaDto>> RecalculateFormulas(int id)
    {
        var schema = await formulaColumns.RecalculateAsync(id);
        return schema is null ? NotFound() : schema;
    }
}
