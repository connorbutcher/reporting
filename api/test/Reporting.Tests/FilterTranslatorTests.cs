using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;
using Xunit;

namespace Reporting.Tests;

/// <summary>
/// Filter trees translated to predicates over rows, run in memory. Operators that compile to plain
/// lambdas are covered here; the LIKE-based text operators need a database (<see cref="TextFilterSqlTests"/>).
/// </summary>
public class FilterTranslatorTests
{
    private static readonly Guid NameRef = Guid.NewGuid();
    private static readonly Guid QtyRef = Guid.NewGuid();
    private static readonly Guid WhenRef = Guid.NewGuid();
    private static readonly Guid OkRef = Guid.NewGuid();

    private static IReadOnlyDictionary<Guid, DatasetColumn> Columns() => new Dictionary<Guid, DatasetColumn>
    {
        [NameRef] = new() { Id = 1, RefId = NameRef, Name = "Name", Type = DatasetColumnType.String },
        [QtyRef] = new() { Id = 2, RefId = QtyRef, Name = "Qty", Type = DatasetColumnType.Int },
        [WhenRef] = new() { Id = 3, RefId = WhenRef, Name = "When", Type = DatasetColumnType.DateTime },
        [OkRef] = new() { Id = 4, RefId = OkRef, Name = "Ok", Type = DatasetColumnType.Bool },
    };

    private static DatasetRow Row(string? name = null, double? qty = null, DateTime? when = null, bool? ok = null)
    {
        var row = new DatasetRow();
        if (name is not null) row.Cells.Add(new DatasetCell { ColumnId = 1, StringValue = name });
        if (qty is not null) row.Cells.Add(new DatasetCell { ColumnId = 2, NumberValue = qty });
        if (when is not null) row.Cells.Add(new DatasetCell { ColumnId = 3, DateValue = when });
        if (ok is not null) row.Cells.Add(new DatasetCell { ColumnId = 4, BoolValue = ok });
        return row;
    }

    private static FilterConditionDto Cond(Guid column, FilterOperator op, params string[] values) =>
        new() { ColumnId = column, Operator = op, Values = [.. values] };

    private static FilterGroupDto And(params FilterNodeDto[] children) => new() { Join = FilterJoin.And, Children = [.. children] };
    private static FilterGroupDto Or(params FilterNodeDto[] children) => new() { Join = FilterJoin.Or, Children = [.. children] };

    private static Func<DatasetRow, bool> Compile(FilterNodeDto node) =>
        FilterTranslator.Build(node, Columns())!.Compile();

    private static bool Matches(FilterNodeDto node, DatasetRow row) => Compile(node)(row);

    public class Trees
    {
        [Fact]
        public void No_filter_builds_no_predicate_and_leaves_rows_untouched()
        {
            var rows = new List<DatasetRow> { Row("a") }.AsQueryable();

            Assert.Null(FilterTranslator.Build(null, Columns()));
            Assert.Same(rows, FilterTranslator.Apply(rows, null, Columns()));
        }

        [Fact]
        public void An_empty_group_filters_nothing_rather_than_matching_nothing()
        {
            Assert.Null(FilterTranslator.Build(And(), Columns()));
            Assert.Null(FilterTranslator.Build(And(Or(), And()), Columns()));
        }

        [Fact]
        public void And_needs_every_condition_and_or_needs_any()
        {
            var both = Row(qty: 5, ok: true);
            var one = Row(qty: 5, ok: false);

            var all = And(Cond(QtyRef, FilterOperator.Equals, "5"), Cond(OkRef, FilterOperator.IsTrue));
            var any = Or(Cond(QtyRef, FilterOperator.Equals, "5"), Cond(OkRef, FilterOperator.IsTrue));

            Assert.True(Matches(all, both));
            Assert.False(Matches(all, one));
            Assert.True(Matches(any, one));
            Assert.False(Matches(any, Row(qty: 6, ok: false)));
        }

        [Fact]
        public void Groups_nest()
        {
            var filter = And(
                Cond(OkRef, FilterOperator.IsTrue),
                Or(Cond(QtyRef, FilterOperator.Equals, "1"), Cond(QtyRef, FilterOperator.Equals, "2")));

            Assert.True(Matches(filter, Row(qty: 2, ok: true)));
            Assert.False(Matches(filter, Row(qty: 3, ok: true)));
            Assert.False(Matches(filter, Row(qty: 2, ok: false)));
        }

        [Fact]
        public void A_disabled_condition_never_narrows_even_in_an_or()
        {
            var off = Cond(QtyRef, FilterOperator.Equals, "1");
            off.Enabled = false;

            var filter = Or(off, Cond(QtyRef, FilterOperator.Equals, "2"));

            Assert.False(Matches(filter, Row(qty: 1)));
            Assert.True(Matches(filter, Row(qty: 2)));
        }
    }

    public class Numbers
    {
        [Theory]
        [InlineData(FilterOperator.Equals, 5, true)]
        [InlineData(FilterOperator.Equals, 6, false)]
        [InlineData(FilterOperator.NotEquals, 6, true)]
        [InlineData(FilterOperator.NotEquals, 5, false)]
        [InlineData(FilterOperator.GreaterThan, 6, true)]
        [InlineData(FilterOperator.GreaterThan, 5, false)]
        [InlineData(FilterOperator.GreaterThanOrEqual, 5, true)]
        [InlineData(FilterOperator.LessThan, 4, true)]
        [InlineData(FilterOperator.LessThan, 5, false)]
        [InlineData(FilterOperator.LessThanOrEqual, 5, true)]
        public void Compare_against_the_operand(FilterOperator op, double cell, bool expected)
        {
            Assert.Equal(expected, Matches(Cond(QtyRef, op, "5"), Row(qty: cell)));
        }

        [Theory]
        [InlineData(1, 9, 5, true)]
        [InlineData(1, 9, 1, true)]
        [InlineData(1, 9, 9, true)]
        [InlineData(1, 9, 10, false)]
        [InlineData(9, 1, 5, true)] // bounds entered the wrong way round
        [InlineData(9, 1, 0, false)]
        public void Between_is_inclusive_and_tolerates_reversed_bounds(double from, double to, double cell, bool expected)
        {
            Assert.Equal(expected, Matches(Cond(QtyRef, FilterOperator.Between, from.ToString(), to.ToString()), Row(qty: cell)));
        }

        [Fact]
        public void A_non_numeric_operand_is_rejected_by_name()
        {
            var error = Assert.Throws<FilterException>(() => Compile(Cond(QtyRef, FilterOperator.Equals, "abc")));

            Assert.Contains("'abc' is not a number", error.Message);
            Assert.Contains("Qty", error.Message);
        }
    }

    public class Dates
    {
        private static readonly DateTime Day = new(2026, 3, 4);

        [Fact]
        public void Equals_means_the_whole_of_that_day_and_not_equals_the_rest()
        {
            var equals = Cond(WhenRef, FilterOperator.Equals, "2026-03-04");
            var notEquals = Cond(WhenRef, FilterOperator.NotEquals, "2026-03-04");

            Assert.True(Matches(equals, Row(when: Day.AddHours(15))));
            Assert.False(Matches(equals, Row(when: Day.AddDays(1))));
            Assert.False(Matches(notEquals, Row(when: Day.AddHours(15))));
            Assert.True(Matches(notEquals, Row(when: Day.AddDays(-1))));
        }

        [Fact]
        public void Before_and_after_compare_instants()
        {
            Assert.True(Matches(Cond(WhenRef, FilterOperator.GreaterThan, "2026-03-04"), Row(when: Day.AddDays(1))));
            Assert.False(Matches(Cond(WhenRef, FilterOperator.GreaterThan, "2026-03-04"), Row(when: Day)));
            Assert.True(Matches(Cond(WhenRef, FilterOperator.GreaterThanOrEqual, "2026-03-04"), Row(when: Day)));
            Assert.True(Matches(Cond(WhenRef, FilterOperator.LessThan, "2026-03-04"), Row(when: Day.AddTicks(-1))));
            Assert.True(Matches(Cond(WhenRef, FilterOperator.LessThanOrEqual, "2026-03-04"), Row(when: Day)));
        }

        [Fact]
        public void Between_includes_the_whole_of_the_upper_day_and_tolerates_reversed_bounds()
        {
            var forward = Cond(WhenRef, FilterOperator.Between, "2026-03-01", "2026-03-03");
            var reversed = Cond(WhenRef, FilterOperator.Between, "2026-03-03", "2026-03-01");
            var inside = Row(when: new DateTime(2026, 3, 3, 23, 30, 0));
            var outside = Row(when: new DateTime(2026, 3, 4));

            Assert.True(Matches(forward, inside));
            Assert.False(Matches(forward, outside));
            Assert.True(Matches(reversed, inside));
            Assert.False(Matches(reversed, Row(when: new DateTime(2026, 2, 28, 23, 59, 0))));
        }

        [Fact]
        public void In_the_last_and_next_days_are_relative_to_today()
        {
            var today = DateTime.UtcNow.Date;
            var last = Cond(WhenRef, FilterOperator.InLastDays, "3");
            var next = Cond(WhenRef, FilterOperator.InNextDays, "3");

            Assert.True(Matches(last, Row(when: today.AddDays(-2))));
            Assert.True(Matches(last, Row(when: today.AddDays(-3))));
            Assert.False(Matches(last, Row(when: today.AddDays(-4))));
            Assert.False(Matches(last, Row(when: today.AddDays(1))));
            Assert.True(Matches(next, Row(when: today.AddDays(3))));
            Assert.False(Matches(next, Row(when: today.AddDays(4))));
            Assert.False(Matches(next, Row(when: today.AddDays(-1))));
        }

        [Fact]
        public void A_non_date_operand_is_rejected_by_name()
        {
            var error = Assert.Throws<FilterException>(() => Compile(Cond(WhenRef, FilterOperator.Equals, "soon")));

            Assert.Contains("'soon' is not a date", error.Message);
        }
    }

    public class Booleans
    {
        [Fact]
        public void True_and_false_match_the_cell()
        {
            Assert.True(Matches(Cond(OkRef, FilterOperator.IsTrue), Row(ok: true)));
            Assert.False(Matches(Cond(OkRef, FilterOperator.IsTrue), Row(ok: false)));
            Assert.True(Matches(Cond(OkRef, FilterOperator.IsFalse), Row(ok: false)));
            Assert.False(Matches(Cond(OkRef, FilterOperator.IsFalse), Row()));
        }
    }

    public class Text
    {
        [Fact]
        public void Equals_and_not_equals_compare_the_whole_value()
        {
            Assert.True(Matches(Cond(NameRef, FilterOperator.Equals, "Day"), Row("Day")));
            Assert.False(Matches(Cond(NameRef, FilterOperator.Equals, "Day"), Row("Days")));
            Assert.True(Matches(Cond(NameRef, FilterOperator.NotEquals, "Day"), Row("Night")));
            Assert.True(Matches(Cond(NameRef, FilterOperator.NotEquals, "Day"), Row()));
            Assert.False(Matches(Cond(NameRef, FilterOperator.NotEquals, "Day"), Row("Day")));
        }

        [Theory]
        [InlineData("Day,Night", "Night", true)]
        [InlineData("Day, Night ,", "Night", true)] // trimmed, blanks dropped
        [InlineData("Day,Night", "Twilight", false)]
        public void In_accepts_one_comma_separated_operand(string list, string cell, bool expected)
        {
            Assert.Equal(expected, Matches(Cond(NameRef, FilterOperator.In, list), Row(cell)));
        }

        [Fact]
        public void In_accepts_several_operands()
        {
            var filter = Cond(NameRef, FilterOperator.In, "Day", "Night");

            Assert.True(Matches(filter, Row("Night")));
            Assert.False(Matches(filter, Row("Twilight")));
        }

        [Fact]
        public void In_needs_at_least_one_value()
        {
            var error = Assert.Throws<FilterException>(() => Compile(Cond(NameRef, FilterOperator.In, " , ")));

            Assert.Contains("at least one value", error.Message);
        }
    }

    public class Presence
    {
        [Fact]
        public void Empty_means_no_cell_or_a_blank_one()
        {
            var empty = Cond(NameRef, FilterOperator.IsEmpty);
            var notEmpty = Cond(NameRef, FilterOperator.IsNotEmpty);

            Assert.True(Matches(empty, Row()));
            Assert.True(Matches(empty, Row("")));
            Assert.False(Matches(empty, Row("x")));
            Assert.True(Matches(notEmpty, Row("x")));
            Assert.False(Matches(notEmpty, Row("")));
        }
    }

    public class Validation
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
}
