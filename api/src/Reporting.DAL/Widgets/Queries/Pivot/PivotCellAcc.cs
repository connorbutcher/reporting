using Reporting.Abstractions;

namespace Reporting.DAL.Widgets;

/// <summary>The rows falling in one pivot cell (a row group, optionally within one column key): their tally and one accumulator per measure.</summary>
public sealed class PivotCellAcc
{
    public int RowCount { get; private set; }
    public PivotMeasureAcc[] Measures { get; }

    public PivotCellAcc(IReadOnlyList<PivotMeasurePlan> measures)
    {
        Measures = measures
            .Select(m => new PivotMeasureAcc(m.Aggregate == PivotAggregate.Median, m.Aggregate == PivotAggregate.CountDistinct))
            .ToArray();
    }

    /// <summary>Adds one row, given its value for each measure (number, and the text a distinct count reads).</summary>
    public void Add(PivotMeasureInput[] inputs)
    {
        RowCount++;
        for (var i = 0; i < inputs.Length; i++)
        {
            var input = inputs[i];
            if (input.Number is { } number)
            {
                Measures[i].Add(number);
            }
            if (input.Text is { } text)
            {
                Measures[i].AddDistinct(text);
            }
        }
    }
}

/// <summary>One row's input to one measure: its number (null if none) and its trimmed text (null if blank).</summary>
public readonly record struct PivotMeasureInput(double? Number, string? Text);
