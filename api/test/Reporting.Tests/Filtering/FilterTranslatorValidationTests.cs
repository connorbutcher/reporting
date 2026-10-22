using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;
using static Reporting.Tests.FilterTranslatorFixture;

namespace Reporting.Tests;

public class FilterTranslatorValidationTests
{
    [Fact]
    public void An_unknown_column_is_rejected()
    {
        var error = Assert.Throws<FilterException>(() => Compile(Cond(Guid.NewGuid(), FilterOperator.Equals, "x")));

        Assert.Contains("not part of this dataset", error.Message);
    }

    [Fact]
    public void An_operator_the_column_type_lacks_is_rejected_naming_both()
    {
        var error = Assert.Throws<FilterException>(() => Compile(Cond(OkRef, FilterOperator.GreaterThan, "1")));

        Assert.Contains("GreaterThan", error.Message);
        Assert.Contains("Bool", error.Message);
        Assert.Contains("Ok", error.Message);
    }

    [Fact]
    public void Too_few_operands_are_rejected_with_how_many_are_needed()
    {
        var error = Assert.Throws<FilterException>(() => Compile(Cond(QtyRef, FilterOperator.Between, "1")));

        Assert.Contains("needs 2 value(s)", error.Message);
    }

    [Fact]
    public void The_catalogue_decides_which_operators_are_valid()
    {
        var onlyContains = FilterOperators.BuildCatalogue(
        [
            new FilterOperatorDefinition
            {
                ColumnType = DatasetColumnType.String, Operator = FilterOperator.Contains,
                Label = "contains", OperandCount = 1, OperandKind = FilterOperandKind.Text,
            },
        ]);

        var error = Assert.Throws<FilterException>(() =>
            FilterTranslator.Build(Cond(NameRef, FilterOperator.Equals, "x"), Columns(), operatorCatalogue: onlyContains));

        Assert.Contains("cannot be used", error.Message);
    }

    [Fact]
    public void A_tolerance_condition_on_a_non_numeric_column_is_rejected()
    {
        var error = Assert.Throws<FilterException>(() => Compile(Cond(NameRef, FilterOperator.InTolerance)));

        Assert.Contains("needs a numeric column", error.Message);
    }
}
