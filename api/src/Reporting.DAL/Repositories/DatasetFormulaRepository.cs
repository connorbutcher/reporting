using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;
using Reporting.DAL.Formulas;

namespace Reporting.DAL.Repositories;

/// <summary>Formula column CRUD, preview and recalculation. Running the formulas is <see cref="FormulaCalculationService"/>'s job; this owns validating and persisting the column definitions.</summary>
public class DatasetFormulaRepository(ReportingDbContext db, FormulaCalculationService calculator)
{
    /// <summary>The functions formulas can call, as the builder's palette lists them — only those callable right now.</summary>
    public async Task<List<FormulaFunctionDto>> GetFunctionsAsync() =>
        (await calculator.GetCatalogueAsync()).ToDtos();

    /// <summary>Checks an unsaved formula and evaluates it on a sample of rows. Null when the dataset doesn't exist.</summary>
    public async Task<FormulaPreviewDto?> PreviewAsync(int id, FormulaPreviewRequestDto request)
    {
        var dataset = await LoadAsync(id);
        return dataset is null
            ? null
            : await calculator.PreviewAsync(dataset, request.Expression ?? string.Empty, request.Type, request.SampleSize);
    }

    /// <summary>
    /// Adds a computed column and fills it for every row. Throws <see cref="DataValidationException"/> for a bad
    /// name or formula. Null when the dataset doesn't exist.
    /// </summary>
    public async Task<DatasetColumnDto?> AddAsync(int id, SaveFormulaColumnDto dto)
    {
        var dataset = await LoadAsync(id);
        if (dataset is null) return null;

        var name = ValidName(dataset, dto.Name, except: null);
        var (expression, type) = await CheckAsync(dataset, dto);

        var column = new DatasetColumn
        {
            RefId = Guid.NewGuid(),
            Name = name,
            Type = type,
            FormulaExpression = expression,
            Order = dataset.Columns.Count == 0 ? 0 : dataset.Columns.Max(c => c.Order) + 1,
        };

        dataset.Columns.Add(column);
        try
        {
            await EnsureRunnableAsync(dataset, column);
        }
        catch (DataValidationException)
        {
            db.ChangeTracker.Clear(); // discard the unsaved column
            throw;
        }

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
        if (dataset is null || column is null) return null;

        if (!column.IsComputed)
            throw new DataValidationException($"[{column.Name}] isn't a formula column.");

        var name = ValidName(dataset, dto.Name, except: column);
        var (expression, type) = await CheckAsync(dataset, dto);

        var oldName = column.Name;
        column.Name = name;
        column.Type = type;
        column.FormulaExpression = expression;
        if (!string.Equals(oldName, name, StringComparison.Ordinal)) FormulaColumnRename.Apply(dataset.Columns, oldName, name);

        try
        {
            await EnsureRunnableAsync(dataset, column);
        }
        catch (DataValidationException)
        {
            db.ChangeTracker.Clear(); // discard the unsaved edits above
            throw;
        }

        await db.SaveChangesAsync();
        await calculator.RecalculateAsync(dataset);
        return column.ToDto();
    }

    /// <summary>Recomputes every computed column of a dataset — for after the function catalogue changed. Null when the dataset doesn't exist.</summary>
    public async Task<DatasetSchemaDto?> RecalculateAsync(int id)
    {
        var dataset = await db.Datasets.Include(d => d.Source).Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);
        if (dataset is null) return null;

        await calculator.RecalculateAsync(dataset);
        return dataset.ToSchemaDto();
    }

    private Task<Dataset?> LoadAsync(int id) =>
        db.Datasets.Include(d => d.Columns).FirstOrDefaultAsync(d => d.Id == id);

    /// <summary>A trimmed name that no other column of the dataset already uses (formulas reference columns by name).</summary>
    private static string ValidName(Dataset dataset, string? name, DatasetColumn? except)
    {
        var trimmed = name?.Trim() ?? string.Empty;
        if (trimmed.Length == 0) throw new DataValidationException("A column needs a name.");
        if (trimmed.Contains('[') || trimmed.Contains(']'))
            throw new DataValidationException("A formula column's name can't contain '[' or ']', so formulas could not refer to it.");
        if (dataset.Columns.Any(c => !ReferenceEquals(c, except) && string.Equals(c.Name, trimmed, StringComparison.OrdinalIgnoreCase)))
            throw new DataValidationException($"There's already a column named [{trimmed}].");

        return trimmed;
    }

    /// <summary>Validates the formula against the dataset and settles the column type: the one asked for, else the one the formula produces.</summary>
    private async Task<(string Expression, DatasetColumnType Type)> CheckAsync(Dataset dataset, SaveFormulaColumnDto dto)
    {
        var expression = dto.Expression?.Trim() ?? string.Empty;
        var catalogue = await calculator.GetCatalogueAsync();

        // A formula that reads its own column passes here and is rejected by EnsureRunnableAsync as circular.
        var analysis = FormulaAnalyzer.Analyze(expression, dataset.Columns, catalogue, dto.Type);
        if (!analysis.IsValid) throw new DataValidationException(analysis.ErrorMessage);

        var type = dto.Type ?? FormulaValues.NaturalColumnType(analysis.ResultKind)
            ?? throw new DataValidationException("The type of this formula's result can't be told from the formula; choose the column's type.");
        return (expression, type);
    }

    /// <summary>Fails when the formula on <paramref name="column"/> can't run in the dataset as it now stands — a circular reference, or a dependency on a formula column that is itself broken.</summary>
    private async Task EnsureRunnableAsync(Dataset dataset, DatasetColumn column)
    {
        var plan = await calculator.PlanAsync(dataset.Columns);
        var planned = plan.For(column);
        if (planned is { IsValid: false }) throw new DataValidationException(planned.Error!);
    }
}
