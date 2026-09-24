using Reporting.DAL.Formulas.Evaluation;
using Reporting.Database;

namespace Reporting.DAL.Formulas;

/// <summary>Writes computed values into a row's cells, as ordinary typed cells — so nothing downstream needs to know a column is computed.</summary>
public sealed class FormulaCellWriter(ReportingDbContext db)
{
    public void Write(DatasetRow row, Dictionary<DatasetColumn, FormulaOutcome> outcomes)
    {
        foreach (var (column, outcome) in outcomes)
        {
            WriteCell(row, column, outcome);
        }
    }

    private void WriteCell(DatasetRow row, DatasetColumn column, FormulaOutcome outcome)
    {
        var raw = FormulaValueText.ToCellText(outcome.Value, column.Type);
        var cell = FindCell(row, column.Id);

        if (raw is null)
        {
            RemoveCell(row, cell);
        }
        else if (cell is null)
        {
            row.Cells.Add(CellValues.Create(column.Id, raw, column.Type));
        }
        else
        {
            CellValues.Apply(cell, raw, column.Type);
        }
    }

    private void RemoveCell(DatasetRow row, DatasetCell? cell)
    {
        if (cell is null)
        {
            return;
        }

        row.Cells.Remove(cell);
        db.DatasetCells.Remove(cell);
    }

    private static DatasetCell? FindCell(DatasetRow row, int columnId)
    {
        foreach (var cell in row.Cells)
        {
            if (cell.ColumnId == columnId)
            {
                return cell;
            }
        }

        return null;
    }
}
