using Reporting.DAL.Formulas.References;

namespace Reporting.Tests.Formulas;

/// <summary>Reading and rewriting the column references in stored formula text.</summary>
public class FormulaColumnReferenceTests
{
    [Fact]
    public void Renaming_a_column_rewrites_only_real_references()
    {
        var renamed = FormulaText.RenameColumn("[Price] * 2 & \"[Price]\" & [price]", "Price", "Cost");

        Assert.Equal("[Cost] * 2 & \"[Price]\" & [Cost]", renamed);
    }

    [Fact]
    public void Renaming_leaves_text_that_cannot_be_read_alone()
    {
        Assert.Equal("\"unterminated [Price]", FormulaText.RenameColumn("\"unterminated [Price]", "Price", "Cost"));
    }

    [Fact]
    public void Referenced_columns_are_read_from_the_token_stream()
    {
        Assert.Equal(["A", "B c"], FormulaText.ReferencedColumnNames("[A] + ROUND([B c]) & \"[Z]\""));
        Assert.Empty(FormulaText.ReferencedColumnNames("\"unterminated"));
    }

    [Fact]
    public void A_formula_references_a_column_ignoring_case()
    {
        Assert.True(FormulaText.References("[Qty] * 2", "qty"));
        Assert.False(FormulaText.References("[Qty] * 2", "Price"));
        Assert.False(FormulaText.References("\"[Qty]\"", "Qty"));
    }
}
