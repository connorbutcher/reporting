using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;
using Reporting.DAL.Filtering;
using Reporting.DAL.Formulas;
using Reporting.DAL.Formulas.References;

namespace Reporting.DAL.Repositories;

/// <summary>Column schema edits, keeping formulas and typed cell values in step.</summary>
internal sealed class DatasetColumnEditor(ReportingDbContext db, FormulaCalculationService formulas)
{
    /// <summary>Throws <see cref="DataValidationException"/> when the config's kind doesn't match the column's type.</summary>
    public async Task<DatasetColumnDto?> UpdateConfigurationAsync(int id, Guid columnId, DatasetColumnConfig configuration)
    {
        var column = await db.DatasetColumns.FirstOrDefaultAsync(c => c.RefId == columnId && c.Dataset!.Id == id);
        if (column is null)
        {
            return null;
        }

        var expected = DatasetColumnConfig.KindFor(column.Type);
        if (configuration.Kind != expected)
        {
            throw new DataValidationException(
                $"Configuration of kind '{configuration.Kind}' doesn't match the column's type '{column.Type}' (expects '{expected}').");
        }

        column.SetConfig(configuration);
        await db.SaveChangesAsync();
        return column.ToDto();
    }

    public async Task<DatasetColumnDto?> AddAsync(int id, string name, DatasetColumnType type)
    {
        var dataset = await db.Datasets.Include(d => d.Source).Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return null;
        }

        DatasetGuards.EnsureNotFiltered(dataset, "A filtered dataset's columns and rows come from its base dataset and can't be edited directly.");

        var column = new DatasetColumn
        {
            RefId = Guid.NewGuid(),
            Name = name,
            Type = type,
            Order = dataset.Columns.Count == 0 ? 0 : dataset.Columns.Max(c => c.Order) + 1,
        };

        dataset.Columns.Add(column);
        await db.SaveChangesAsync();

        // A new column can be what a formula that was waiting on a missing column needs.
        if (dataset.Columns.Any(c => c.FormulaError is not null))
        {
            await formulas.RecalculateAsync(dataset);
        }

        return column.ToDto();
    }

    public async Task<DatasetColumnDto?> UpdateAsync(int id, Guid columnId, string name, DatasetColumnType type)
    {
        var dataset = await db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        var column = dataset?.Columns.FirstOrDefault(c => c.RefId == columnId);
        if (dataset is null || column is null)
        {
            return null;
        }

        var typeChanged = column.Type != type;
        if (typeChanged && column.IsComputed)
        {
            throw new DataValidationException("A formula column's type comes from its formula; edit the formula to change it.");
        }

        var oldName = column.Name;
        column.Name = name;
        column.Type = type;

        // Formulas name columns, so a rename carries through to the formulas that read this one.
        if (!string.Equals(oldName, name, StringComparison.Ordinal))
        {
            FormulaColumnRename.Apply(dataset.Columns, oldName, name);
        }

        if (typeChanged)
        {
            await ReparseCellsAsync(column.Id, type);
        }

        await db.SaveChangesAsync();

        // Formulas that read this column see different values (or types) now.
        if (typeChanged && dataset.Columns.Any(c => c.IsComputed))
        {
            await formulas.RecalculateAsync(dataset);
        }
        return column.ToDto();
    }

    public async Task<bool> DeleteAsync(int id, Guid columnId)
    {
        var column = await db.DatasetColumns.FirstOrDefaultAsync(c => c.RefId == columnId && c.Dataset!.Id == id);
        if (column is null)
        {
            return false;
        }

        var formulaColumns = await db.DatasetColumns.Where(c => c.DatasetId == id && c.FormulaExpression != null).ToListAsync();
        var dependents = FormulaColumnRename.Dependents(formulaColumns, column);
        if (dependents.Count > 0)
        {
            throw new DataConflictException(
                $"[{column.Name}] is read by the formula in {string.Join(", ", dependents.Select(d => $"[{d}]"))}. Change or remove that formula first.");
        }

        db.DatasetColumns.Remove(column);

        // Cells reference the column without a FK, so they don't cascade.
        var cells = await db.DatasetCells.Where(c => c.ColumnId == column.Id).ToListAsync();
        db.DatasetCells.RemoveRange(cells);

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<DatasetSchemaDto?> ReorderAsync(int id, List<Guid> columnIds)
    {
        var dataset = await db.Datasets
            .Include(d => d.Source)
            .Include(d => d.Columns)
            .FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return null;
        }

        DatasetGuards.EnsureNotFiltered(dataset, "A filtered dataset's columns and rows come from its base dataset and can't be edited directly.");

        for (var i = 0; i < columnIds.Count; i++)
        {
            var column = dataset.Columns.FirstOrDefault(c => c.RefId == columnIds[i]);
            if (column is not null)
            {
                column.Order = i;
            }
        }

        await db.SaveChangesAsync();
        return dataset.ToSchemaDto();
    }

    /// <summary>Typed fields were parsed under the old type; re-derive them from each cell's text.</summary>
    private async Task ReparseCellsAsync(int columnId, DatasetColumnType type)
    {
        var cells = await db.DatasetCells.Where(c => c.ColumnId == columnId).ToListAsync();
        foreach (var cell in cells)
        {
            CellValues.Apply(cell, cell.StringValue, type);
        }
    }
}
