using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Reporting.Api.Contracts;
using Reporting.Api.Data;
using Reporting.Api.Domain;

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

    /// <summary>Replaces a column's free-form display configuration blob.</summary>
    [HttpPut("{id:guid}/columns/{columnId:guid}/configuration")]
    public async Task<ActionResult<DatasetColumnDto>> UpdateColumnConfiguration(
        Guid id,
        Guid columnId,
        [FromBody] JsonElement configuration)
    {
        var column = await _db.DatasetColumns.FirstOrDefaultAsync(c => c.Id == columnId && c.DatasetId == id);
        if (column is null) return NotFound();

        if (configuration.ValueKind is not (JsonValueKind.Object or JsonValueKind.Null or JsonValueKind.Undefined))
        {
            return BadRequest("Column configuration must be a JSON object.");
        }

        column.ConfigurationJson = configuration.ValueKind == JsonValueKind.Object
            ? configuration.GetRawText()
            : "{}";

        await _db.SaveChangesAsync();
        return column.ToDto();
    }

    // --- dataset management ---------------------------------------------------

    [HttpPost]
    public async Task<ActionResult<DatasetSummaryDto>> Create(SaveDatasetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A dataset needs a name.");

        var dataset = new Dataset { Id = Guid.NewGuid(), Name = dto.Name.Trim() };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSchema), new { id = dataset.Id }, dataset.ToSummaryDto());
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DatasetSummaryDto>> Rename(Guid id, SaveDatasetDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A dataset needs a name.");

        var dataset = await _db.Datasets.FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return NotFound();

        dataset.Name = dto.Name.Trim();
        await _db.SaveChangesAsync();
        return dataset.ToSummaryDto();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var dataset = await _db.Datasets.FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return NotFound();

        // Columns and rows cascade; widgets pointing here are reported as an
        // issue in the builder rather than blocking the delete.
        _db.Datasets.Remove(dataset);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // --- columns --------------------------------------------------------------

    [HttpPost("{id:guid}/columns")]
    public async Task<ActionResult<DatasetColumnDto>> AddColumn(Guid id, SaveDatasetColumnDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A column needs a name.");

        var dataset = await _db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return NotFound();

        var column = new DatasetColumn
        {
            Id = Guid.NewGuid(),
            DatasetId = id,
            Name = dto.Name.Trim(),
            Type = dto.Type,
            Order = dataset.Columns.Count == 0 ? 0 : dataset.Columns.Max(c => c.Order) + 1,
        };

        dataset.Columns.Add(column);
        // The id is generated here, so change detection would otherwise read
        // this as an existing row and emit an UPDATE that matches nothing.
        _db.Entry(column).State = EntityState.Added;

        await _db.SaveChangesAsync();
        return column.ToDto();
    }

    [HttpPut("{id:guid}/columns/{columnId:guid}")]
    public async Task<ActionResult<DatasetColumnDto>> UpdateColumn(
        Guid id,
        Guid columnId,
        SaveDatasetColumnDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A column needs a name.");

        var column = await _db.DatasetColumns.FirstOrDefaultAsync(c => c.Id == columnId && c.DatasetId == id);
        if (column is null) return NotFound();

        column.Name = dto.Name.Trim();
        column.Type = dto.Type;
        await _db.SaveChangesAsync();
        return column.ToDto();
    }

    [HttpDelete("{id:guid}/columns/{columnId:guid}")]
    public async Task<IActionResult> DeleteColumn(Guid id, Guid columnId)
    {
        var column = await _db.DatasetColumns.FirstOrDefaultAsync(c => c.Id == columnId && c.DatasetId == id);
        if (column is null) return NotFound();

        _db.DatasetColumns.Remove(column);

        // Row values are keyed by column id, so drop the orphaned entries too.
        var rows = await _db.DatasetRows.Where(r => r.DatasetId == id).ToListAsync();
        foreach (var row in rows)
        {
            var values = row.GetValues();
            if (values.Remove(columnId)) row.SetValues(values);
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id:guid}/columns/order")]
    public async Task<ActionResult<DatasetSchemaDto>> ReorderColumns(Guid id, ReorderColumnsDto dto)
    {
        var dataset = await _db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return NotFound();

        for (var i = 0; i < dto.ColumnIds.Count; i++)
        {
            var column = dataset.Columns.FirstOrDefault(c => c.Id == dto.ColumnIds[i]);
            if (column is not null) column.Order = i;
        }

        await _db.SaveChangesAsync();
        return dataset.ToSchemaDto();
    }

    // --- rows -----------------------------------------------------------------

    [HttpPost("{id:guid}/rows")]
    public async Task<ActionResult<DatasetRowDto>> AddRow(Guid id, SaveDatasetRowDto dto)
    {
        var dataset = await _db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return NotFound();

        var row = new DatasetRow { Id = Guid.NewGuid(), DatasetId = id };
        row.SetValues(KnownValues(dataset, dto.Values));

        _db.DatasetRows.Add(row);
        await _db.SaveChangesAsync();
        return new DatasetRowDto { Id = row.Id, Values = row.GetValues() };
    }

    [HttpPut("{id:guid}/rows/{rowId:guid}")]
    public async Task<ActionResult<DatasetRowDto>> UpdateRow(Guid id, Guid rowId, SaveDatasetRowDto dto)
    {
        var dataset = await _db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return NotFound();

        var row = await _db.DatasetRows.FirstOrDefaultAsync(r => r.Id == rowId && r.DatasetId == id);
        if (row is null) return NotFound();

        row.SetValues(KnownValues(dataset, dto.Values));
        await _db.SaveChangesAsync();
        return new DatasetRowDto { Id = row.Id, Values = row.GetValues() };
    }

    [HttpDelete("{id:guid}/rows/{rowId:guid}")]
    public async Task<IActionResult> DeleteRow(Guid id, Guid rowId)
    {
        var row = await _db.DatasetRows.FirstOrDefaultAsync(r => r.Id == rowId && r.DatasetId == id);
        if (row is null) return NotFound();

        _db.DatasetRows.Remove(row);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Drops values for columns the dataset doesn't have, so stale keys never accumulate.</summary>
    private static Dictionary<Guid, string> KnownValues(Dataset dataset, Dictionary<Guid, string> values)
    {
        var known = dataset.Columns.Select(c => c.Id).ToHashSet();
        return values.Where(pair => known.Contains(pair.Key)).ToDictionary(p => p.Key, p => p.Value);
    }
}
