using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Formulas;
using Reporting.DAL.Formulas.Catalogue;
using Reporting.DAL.Formulas.References;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>Formula column CRUD, preview and recalculation. Running the formulas is <see cref="FormulaCalculationService"/>'s job and checking them <see cref="FormulaColumnValidator"/>'s; this owns persisting the column definitions.</summary>
public class DatasetFormulaRepository(ReportingDbContext db, FormulaCalculationService calculator)
{
    private readonly FormulaColumnValidator _validator = new(calculator);

    /// <summary>The functions formulas can call, as the builder's palette lists them — only those callable right now.</summary>
    public async Task<List<FormulaFunctionDto>> GetFunctionsAsync()
    {
        var catalogue = await calculator.GetCatalogueAsync();
        return catalogue.ToDtos();
    }

    /// <summary>Checks an unsaved formula and evaluates it on a sample of rows. Null when the dataset doesn't exist.</summary>
    public async Task<FormulaPreviewDto?> PreviewAsync(int id, FormulaPreviewRequestDto request)
    {
        var dataset = await LoadAsync(id);
        if (dataset is null)
        {
            return null;
        }

        return await calculator.PreviewAsync(dataset, request.Expression ?? string.Empty, request.Type, request.SampleSize);
    }

    /// <summary>
    /// Adds a computed column and fills it for every row. Throws <see cref="DataValidationException"/> for a bad
    /// name or formula. Null when the dataset doesn't exist.
    /// </summary>
    public async Task<DatasetColumnDto?> AddAsync(int id, SaveFormulaColumnDto dto)
    {
        var dataset = await LoadAsync(id);
        if (dataset is null)
        {
            return null;
        }

        var name = FormulaColumnValidator.ValidName(dataset, dto.Name, except: null);
        var (expression, type) = await _validator.CheckAsync(dataset, dto);

        var column = new DatasetColumn
        {
            RefId = Guid.NewGuid(),
            Name = name,
            Type = type,
            FormulaExpression = expression,
            Order = NextOrder(dataset),
        };

        dataset.Columns.Add(column);
        await EnsureRunnableOrDiscardAsync(dataset, column);

        await db.SaveChangesAsync();
        await calculator.RecalculateAsync(dataset);
        return column.ToDto();
    }

    /// <summary>
    /// Replaces a computed column's name, formula and type. Formulas elsewhere that referred to the old name
    /// follow the rename. Throws <see cref="DataValidationException"/> for a bad name or formula, or a column
    /// that isn't computed; nothing is saved in that case. Null when the column doesn't exist.
    /// </summary>
    public async Task<DatasetColumnDto?> UpdateAsync(int id, Guid columnId, SaveFormulaColumnDto dto)
    {
        var dataset = await LoadAsync(id);
        var column = dataset?.Columns.FirstOrDefault(c => c.RefId == columnId);
        if (dataset is null || column is null)
        {
            return null;
        }

        if (!column.IsComputed)
        {
            throw new DataValidationException($"[{column.Name}] isn't a formula column.");
        }

        var name = FormulaColumnValidator.ValidName(dataset, dto.Name, except: column);
        var (expression, type) = await _validator.CheckAsync(dataset, dto);

        Apply(dataset, column, name, type, expression);
        await EnsureRunnableOrDiscardAsync(dataset, column);

        await db.SaveChangesAsync();
        await calculator.RecalculateAsync(dataset);
        return column.ToDto();
    }

    /// <summary>Recomputes every computed column of a dataset — for after the function catalogue changed. Null when the dataset doesn't exist.</summary>
    public async Task<DatasetSchemaDto?> RecalculateAsync(int id)
    {
        var dataset = await db.Datasets.Include(d => d.Source).Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null)
        {
            return null;
        }

        await calculator.RecalculateAsync(dataset);
        return dataset.ToSchemaDto();
    }

    private static int NextOrder(Dataset dataset)
    {
        return dataset.Columns.Count == 0 ? 0 : dataset.Columns.Max(c => c.Order) + 1;
    }

    /// <summary>Changes the column and, if it was renamed, the formulas elsewhere that read it under its old name.</summary>
    private static void Apply(Dataset dataset, DatasetColumn column, string name, DatasetColumnType type, string expression)
    {
        var oldName = column.Name;
        column.Name = name;
        column.Type = type;
        column.FormulaExpression = expression;

        if (!string.Equals(oldName, name, StringComparison.Ordinal))
        {
            FormulaColumnRename.Apply(dataset.Columns, oldName, name);
        }
    }

    /// <summary>Checks the column can run; if not, the unsaved changes made to the tracked columns are thrown away before the failure propagates.</summary>
    private async Task EnsureRunnableOrDiscardAsync(Dataset dataset, DatasetColumn column)
    {
        try
        {
            await _validator.EnsureRunnableAsync(dataset, column);
        }
        catch (DataValidationException)
        {
            db.ChangeTracker.Clear();
            throw;
        }
    }

    private Task<Dataset?> LoadAsync(int id)
    {
        return db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
    }
}
