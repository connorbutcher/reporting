using Reporting.Abstractions;

namespace Reporting.Tests.Formulas;

/// <summary>Previewing an unsaved formula on a sample of rows: nothing is saved, and problems come back as data rather than a failed request.</summary>
public class FormulaPreviewTests : FormulaColumnTestBase
{
    [Fact]
    public async Task Preview_evaluates_a_sample_without_saving_anything()
    {
        await SeedAsync();

        var preview = await PreviewAsync("[Qty] * [Price]", sampleSize: 2);

        Assert.True(preview.IsValid);
        Assert.Equal(DatasetColumnType.Double, preview.InferredType);
        Assert.Equal(["21", "12"], preview.Rows.Select(r => r.Value));
        Assert.DoesNotContain(Db.DatasetColumns, c => c.FormulaExpression != null);
    }

    [Fact]
    public async Task Preview_shows_each_rows_values_in_the_columns_the_formula_reads()
    {
        await SeedAsync();

        var preview = await PreviewAsync("[Price] * [Qty] + 1", sampleSize: 5);

        // Only the columns the formula reads, in dataset order (not the order it names them).
        Assert.Equal(["Qty", "Price"], preview.InputColumns);
        Assert.Equal("2", preview.Rows[0].Inputs["Qty"]);
        Assert.Equal("10.5", preview.Rows[0].Inputs["Price"]);
        Assert.Equal("22", preview.Rows[0].Value);
    }

    [Fact]
    public async Task A_blank_input_is_shown_as_null_so_a_blank_result_can_be_explained()
    {
        await SeedAsync();

        var preview = await PreviewAsync("[Price] * [Qty] + 1", sampleSize: 5);

        Assert.Null(preview.Rows[2].Inputs["Qty"]);
        Assert.Equal("7", preview.Rows[2].Inputs["Price"]);
        Assert.Null(preview.Rows[2].Value);
    }

    [Fact]
    public async Task Preview_reports_problems_as_structured_errors_rather_than_failing()
    {
        await SeedAsync();

        var preview = await PreviewAsync("[Qty] + [Nope]");

        Assert.False(preview.IsValid);
        var error = Assert.Single(preview.Errors);
        Assert.Contains("[Nope]", error.Message);
        Assert.Equal(8, error.Position);
        Assert.Equal(6, error.Length);
        Assert.Empty(preview.Rows);
    }

    [Fact]
    public async Task Preview_reports_a_per_row_failure_on_that_row_only()
    {
        await SeedAsync();

        var preview = await PreviewAsync("DATEADD(\"fortnight\", 1, [Ordered])");

        Assert.True(preview.IsValid); // the unit is only known at run time
        Assert.Contains("fortnight", preview.Rows[0].Error);
        Assert.Null(preview.Rows[2].Error); // a blank date short-circuits before the unit is even looked at
    }

    [Fact]
    public async Task Preview_can_read_existing_formula_columns()
    {
        await SeedAsync();
        await AddFormulaAsync("Total", "[Qty] * [Price]");

        var preview = await PreviewAsync("[Total] + 1");

        Assert.Equal(["22", "13", null], preview.Rows.Select(r => r.Value));
    }

    [Fact]
    public async Task Preview_of_a_missing_dataset_reads_as_not_found()
    {
        Assert.Null(await Fresh().Formulas.PreviewAsync(9999, new FormulaPreviewRequestDto { Expression = "1" }));
    }

    private async Task<FormulaPreviewDto> PreviewAsync(string expression, int sampleSize = 10)
    {
        var request = new FormulaPreviewRequestDto { Expression = expression, SampleSize = sampleSize };
        return (await Fresh().Formulas.PreviewAsync(DatasetId, request))!;
    }
}
