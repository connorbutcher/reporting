using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Formulas.Analysis;
using Reporting.DAL.Formulas.Catalogue;
using Reporting.DAL.Formulas.Evaluation;
using Reporting.DAL.Formulas.Planning;
using Reporting.Database;

namespace Reporting.DAL.Formulas;

/// <summary>
/// Checks an unsaved formula and evaluates it against the first rows of a dataset, without changing anything.
/// With no declared type, the type is the one the formula naturally produces (text when that can't be told).
/// </summary>
public sealed class FormulaPreviewBuilder(ReportingDbContext db)
{
    private const int MaxPreviewRows = 50;

    public async Task<FormulaPreviewDto> BuildAsync(
        Dataset dataset,
        string expression,
        DatasetColumnType? type,
        int sampleSize,
        FormulaFunctionCatalogue catalogue)
    {
        var analysis = FormulaAnalyzer.Analyze(expression, dataset.Columns, catalogue, type);

        var preview = new FormulaPreviewDto
        {
            IsValid = analysis.IsValid,
            Errors = analysis.Errors.ToList(),
            InferredType = analysis.IsValid ? FormulaValueKinds.NaturalColumnType(analysis.ResultKind) : null
        };
        if (!analysis.IsValid)
        {
            return preview;
        }

        // Plan it as a real column (so a dependency on a broken formula column is caught), but never attach it.
        var candidate = new DatasetColumn
        {
            Name = "\0preview",
            Type = type ?? preview.InferredType ?? DatasetColumnType.String,
            FormulaExpression = expression
        };
        var plan = FormulaPlan.Build([.. dataset.Columns, candidate], catalogue);
        var planned = plan.For(candidate)!;
        if (!planned.IsValid)
        {
            preview.IsValid = false;
            preview.Errors.Add(FormulaErrors.At(planned.Error!, 0, expression.Length));
            return preview;
        }

        var inputs = planned.Analysis.References.Where(c => c.Id != 0).OrderBy(c => c.Order).ToList();
        preview.InputColumns = inputs.Select(c => c.Name).ToList();

        var rows = await LoadSampleAsync(dataset.Id, sampleSize);
        foreach (var row in rows)
        {
            preview.Rows.Add(PreviewRow(row, plan, candidate, inputs));
        }

        return preview;
    }

    private Task<List<DatasetRow>> LoadSampleAsync(int datasetId, int sampleSize)
    {
        return db.DatasetRows
            .AsNoTracking()
            .Where(r => r.DatasetId == datasetId)
            .OrderBy(r => r.Id)
            .Take(Math.Clamp(sampleSize, 1, MaxPreviewRows))
            .Include(r => r.Cells)
            .ToListAsync();
    }

    private static FormulaPreviewRowDto PreviewRow(
        DatasetRow row,
        FormulaPlan plan,
        DatasetColumn candidate,
        List<DatasetColumn> inputs)
    {
        var outcome = plan.Evaluate(row)[candidate];

        var cells = new Dictionary<int, DatasetCell>(row.Cells.Count);
        foreach (var cell in row.Cells)
        {
            cells.TryAdd(cell.ColumnId, cell);
        }

        var inputValues = new Dictionary<string, string?>(inputs.Count);
        foreach (var input in inputs)
        {
            var hasValue = cells.TryGetValue(input.Id, out var cell) && !string.IsNullOrWhiteSpace(cell.StringValue);
            inputValues[input.Name] = hasValue ? cell!.StringValue : null;
        }

        return new FormulaPreviewRowDto
        {
            RowId = row.RefId,
            Value = FormulaValueText.ToCellText(outcome.Value, candidate.Type),
            Error = outcome.Error,
            Inputs = inputValues
        };
    }
}
