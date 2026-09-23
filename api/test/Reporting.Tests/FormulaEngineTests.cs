using Reporting.Abstractions;
using Reporting.DAL.Formulas;
using Reporting.DAL.Formulas.Functions;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>The formula language and its function library, run in memory against the seeded catalogue.</summary>
public class FormulaEngineTests
{
    private static readonly FormulaFunctionCatalogue Catalogue = FormulaFunctionCatalogue.Default;

    /// <summary>Evaluates an expression over named column values (a blank is null); fails the test if the formula doesn't check.</summary>
    private sealed record Col(string Name, object? Value, DatasetColumnType? Type = null);

    private static object? Run(string expression, params Col[] values)
    {
        var columns = values.Select((v, i) => new DatasetColumn { Id = i + 1, Name = v.Name, Type = v.Type ?? TypeOf(v.Value) }).ToList();
        var analysis = FormulaAnalyzer.Analyze(expression, columns, Catalogue);
        Assert.True(analysis.IsValid, $"'{expression}' should be valid but: {analysis.ErrorMessage}");

        return new FormulaEvaluator(Catalogue).Evaluate(analysis, column => values[column.Id - 1].Value);
    }

    private static DatasetColumnType TypeOf(object? value) => value switch
    {
        double => DatasetColumnType.Double,
        bool => DatasetColumnType.Bool,
        DateTime => DatasetColumnType.DateTime,
        _ => DatasetColumnType.String
    };

    private static FormulaAnalysis Check(string expression, params (string Name, DatasetColumnType Type)[] columns) =>
        FormulaAnalyzer.Analyze(
            expression,
            columns.Select((c, i) => new DatasetColumn { Id = i + 1, Name = c.Name, Type = c.Type }).ToList(),
            Catalogue);

    // --- the catalogue itself ---

    [Fact]
    public void Every_seeded_function_has_a_server_implementation()
    {
        var (functions, _) = FormulaFunctionSeedData.Rows();
        var missing = functions.Where(f => !FormulaFunctionImplementations.All.ContainsKey(f.ImplementationKey)).Select(f => f.Name);
        Assert.Empty(missing);
        Assert.Equal(functions.Count, Catalogue.All.Count);
    }

    [Fact]
    public void Every_implementation_is_reachable_through_a_seeded_definition()
    {
        var (functions, _) = FormulaFunctionSeedData.Rows();
        var keys = functions.Select(f => f.ImplementationKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
        Assert.Empty(FormulaFunctionImplementations.All.Keys.Where(k => !keys.Contains(k)));
    }

    [Fact]
    public void Seeded_function_examples_all_parse_and_check()
    {
        // The examples are documentation shown to users; they must be formulas the engine accepts.
        var columns = new[] { "Price", "Length", "Pallets", "Age", "Actual", "Target", "Variance", "Area", "Radius", "Count", "Value",
            "Reading 1", "Reading 2", "Reading 3", "Labour", "Materials", "Freight", "Score", "Scrap", "Produced", "Defects", "Inspected",
            "Last Month", "This Month", "Region", "Email", "Name", "Part Number", "Serial", "First Name", "Last Name", "City", "Country",
            "Notes", "File", "Part", "Rating", "Id", "Reading Text", "Year", "Month", "Diameter", "Passed", "Signed Off", "Late", "Damaged",
            "Override", "Default", "Inspected By", "Rate" };
        var dates = new[] { "Build Date", "Logged At", "Invoice Date", "Ordered", "Shipped" };

        var all = columns.Select(n => new DatasetColumn { Name = n, Type = TypeFor(n) })
            .Concat(dates.Select(n => new DatasetColumn { Name = n, Type = DatasetColumnType.DateTime }))
            .ToList();

        foreach (var function in Catalogue.All)
        {
            var analysis = FormulaAnalyzer.Analyze(function.Definition.Example, all, Catalogue);
            Assert.True(analysis.IsValid, $"{function.Name}: {function.Definition.Example} — {analysis.ErrorMessage}");
        }
    }

    private static DatasetColumnType TypeFor(string name) => name switch
    {
        "Region" or "Email" or "Name" or "Part Number" or "Serial" or "First Name" or "Last Name" or "City" or "Country"
            or "Notes" or "File" or "Part" or "Reading Text" or "Inspected By" => DatasetColumnType.String,
        "Passed" or "Signed Off" or "Late" or "Damaged" => DatasetColumnType.Bool,
        _ => DatasetColumnType.Double
    };

    // --- syntax and operators ---

    [Theory]
    [InlineData("1 + 2 * 3", 7.0)]
    [InlineData("(1 + 2) * 3", 9.0)]
    [InlineData("2 ^ 3 ^ 2", 512.0)]
    [InlineData("-2 ^ 2", -4.0)]
    [InlineData("10 % 4", 2.0)]
    [InlineData("-7 % 3", 2.0)]
    [InlineData("1.5e2 + .5", 150.5)]
    [InlineData("10 / 4", 2.5)]
    public void Arithmetic_follows_conventional_precedence(string expression, double expected) =>
        Assert.Equal(expected, Run(expression));

    [Fact]
    public void Division_by_zero_is_blank_not_an_error() => Assert.Null(Run("1 / 0"));

    [Fact]
    public void A_guarded_division_still_works_even_though_every_branch_is_evaluated() =>
        Assert.Equal(0.0, Run("IF([Qty] = 0, 0, [Total] / [Qty])", new Col("Qty", 0.0), new Col("Total", 10.0)));

    [Theory]
    [InlineData("1 < 2 AND 2 < 3", true)]
    [InlineData("1 > 2 OR 2 < 3", true)]
    [InlineData("NOT 1 > 2", true)]
    [InlineData("NOT(1 > 2)", true)]
    [InlineData("1 = 1 AND NOT 2 = 2", false)]
    [InlineData("\"abc\" = \"ABC\"", true)]
    [InlineData("\"a\" < \"b\"", true)]
    [InlineData("1 <> 2", true)]
    [InlineData("1 != 2", true)]
    [InlineData("TRUE OR FALSE AND FALSE", true)]
    public void Comparison_and_logic(string expression, bool expected) => Assert.Equal(expected, Run(expression));

    [Fact]
    public void Ampersand_joins_text_and_treats_blanks_as_empty() =>
        Assert.Equal("ab5", Run("[A] & [B] & 5", new Col("A", "a"), new Col("B", "b")));

    [Fact]
    public void String_literals_may_contain_escaped_quotes() => Assert.Equal("say \"hi\"", Run("\"say \"\"hi\"\"\""));

    [Fact]
    public void Blank_propagates_through_operators_and_strict_functions()
    {
        Assert.Null(Run("[A] + 1", new Col("A", null, DatasetColumnType.Double)));
        Assert.Null(Run("ROUND([N])", new Col("N", null, DatasetColumnType.Double)));
    }

    [Theory]
    [InlineData("1 +", "ends unexpectedly")]
    [InlineData("(1 + 2", "Missing closing")]
    [InlineData("1 < 2 < 3", "can't be chained")]
    [InlineData("\"abc", "closing quote")]
    [InlineData("[Price", "closing ']'")]
    [InlineData("Price + 1", "square brackets")]
    [InlineData("1 $ 2", "Unexpected character")]
    [InlineData("", "Enter a formula")]
    [InlineData("ROUND(1,)", "Unexpected")]
    public void Syntax_errors_are_reported_with_a_message(string expression, string expectedFragment)
    {
        var analysis = Check(expression);
        Assert.False(analysis.IsValid);
        Assert.Contains(expectedFragment, analysis.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void A_syntax_error_says_where_it_is()
    {
        var error = Check("1 + $").Errors.Single();
        Assert.Equal(4, error.Position);
        Assert.Equal(1, error.Length);
    }

    // --- static checking against the catalogue ---

    [Fact]
    public void Unknown_columns_and_functions_are_reported_together()
    {
        var analysis = Check("NOPE([Missing]) + [Also Missing]");
        Assert.Equal(3, analysis.Errors.Count);
        Assert.Contains(analysis.Errors, e => e.Message.Contains("no function named NOPE"));
        Assert.Contains(analysis.Errors, e => e.Message.Contains("[Missing]"));
        Assert.Contains(analysis.Errors, e => e.Message.Contains("[Also Missing]"));
    }

    [Theory]
    [InlineData("ROUND()")]
    [InlineData("ROUND(1, 2, 3)")]
    [InlineData("IF(TRUE, 1)")]
    [InlineData("PI(1)")]
    [InlineData("SUM()")]
    public void Wrong_argument_counts_are_reported_from_the_catalogue_signature(string expression)
    {
        var analysis = Check(expression);
        Assert.False(analysis.IsValid);
        Assert.Contains("argument", analysis.ErrorMessage);
    }

    [Fact]
    public void Argument_kinds_are_checked_against_the_parameter_kinds()
    {
        var analysis = Check("ROUND([Name])", ("Name", DatasetColumnType.String));
        Assert.Contains("needs a number", analysis.ErrorMessage);

        Assert.Contains("needs text", Check("UPPER([N])", ("N", DatasetColumnType.Int)).ErrorMessage);
        Assert.Contains("needs a true/false", Check("IF([N], 1, 2)", ("N", DatasetColumnType.Int)).ErrorMessage);
        Assert.Contains("Can't compare", Check("[N] = \"x\"", ("N", DatasetColumnType.Int)).ErrorMessage);
        Assert.Contains("needs numbers", Check("[S] * 2", ("S", DatasetColumnType.String)).ErrorMessage);
    }

    [Fact]
    public void An_ambiguous_column_name_is_refused()
    {
        var analysis = Check("[A] + 1", ("A", DatasetColumnType.Int), ("a", DatasetColumnType.Int));
        Assert.Contains("More than one column", analysis.ErrorMessage);
    }

    [Theory]
    [InlineData("1 + 2", FormulaValueKind.Number)]
    [InlineData("\"a\" & \"b\"", FormulaValueKind.Text)]
    [InlineData("1 < 2", FormulaValueKind.Bool)]
    [InlineData("YEAR([D])", FormulaValueKind.Number)]
    [InlineData("DATEADD(\"day\", 1, [D])", FormulaValueKind.Date)]
    [InlineData("IF(TRUE, 1, 2)", FormulaValueKind.Number)]
    [InlineData("IF(TRUE, 1, \"x\")", FormulaValueKind.Any)]
    [InlineData("IF(TRUE, NULL, 2)", FormulaValueKind.Number)]
    [InlineData("COALESCE([S], \"fallback\")", FormulaValueKind.Text)]
    [InlineData("ISBLANK([S])", FormulaValueKind.Bool)]
    public void The_result_kind_is_inferred_from_the_catalogue(string expression, FormulaValueKind expected)
    {
        var analysis = Check(expression, ("D", DatasetColumnType.DateTime), ("S", DatasetColumnType.String));
        Assert.True(analysis.IsValid, analysis.ErrorMessage);
        Assert.Equal(expected, analysis.ResultKind);
    }

    [Fact]
    public void A_result_that_doesnt_fit_the_declared_column_type_is_refused()
    {
        var columns = new[] { new DatasetColumn { Id = 1, Name = "N", Type = DatasetColumnType.Int } };
        Assert.Contains("doesn't fit", FormulaAnalyzer.Analyze("[N] > 1", columns, Catalogue, DatasetColumnType.Double).ErrorMessage);
        Assert.True(FormulaAnalyzer.Analyze("[N] + 1", columns, Catalogue, DatasetColumnType.Int).IsValid);
        Assert.True(FormulaAnalyzer.Analyze("[N] > 1", columns, Catalogue, DatasetColumnType.String).IsValid); // text takes anything
    }

    // --- the function library ---

    [Theory]
    [InlineData("ROUND(2.5)", 3.0)]
    [InlineData("ROUND(-2.5)", -3.0)]
    [InlineData("ROUND(1.005, 2)", 1.01)]
    [InlineData("ROUND(1234, -2)", 1200.0)]
    [InlineData("ROUNDUP(1.1 * 10 / 10, 0)", 2.0)]
    [InlineData("ROUNDUP(-1.21, 1)", -1.3)]
    [InlineData("ROUNDDOWN(1.29, 1)", 1.2)]
    [InlineData("ROUNDDOWN(-1.29, 1)", -1.2)]
    [InlineData("CEILING(1.2)", 2.0)]
    [InlineData("FLOOR(-1.2)", -2.0)]
    [InlineData("ABS(-3)", 3.0)]
    [InlineData("SIGN(-9)", -1.0)]
    [InlineData("SQRT(16)", 4.0)]
    [InlineData("POWER(2, 10)", 1024.0)]
    [InlineData("MOD(10, 3)", 1.0)]
    [InlineData("MOD(-1, 3)", 2.0)]
    [InlineData("LOG(8, 2)", 3.0)]
    [InlineData("LOG(100)", 2.0)]
    [InlineData("MIN(3, 1, 2)", 1.0)]
    [InlineData("MAX(3, 1, 2)", 3.0)]
    [InlineData("SUM(1, 2, 3)", 6.0)]
    [InlineData("AVERAGE(1, 2, 6)", 3.0)]
    [InlineData("MEDIAN(5, 1, 3)", 3.0)]
    [InlineData("MEDIAN(4, 1, 3, 2)", 2.5)]
    [InlineData("CLAMP(150, 0, 100)", 100.0)]
    [InlineData("CLAMP(-5, 0, 100)", 0.0)]
    [InlineData("PERCENTOF(25, 200)", 12.5)]
    [InlineData("PERCENTCHANGE(50, 75)", 50.0)]
    [InlineData("DIVIDE(10, 4)", 2.5)]
    [InlineData("DIVIDE(10, 0, -1)", -1.0)]
    [InlineData("PI()", Math.PI)]
    public void Math_functions(string expression, double expected) =>
        Assert.Equal(expected, (double)Run(expression)!, 9);

    [Theory]
    [InlineData("SQRT(-1)")]
    [InlineData("MOD(1, 0)")]
    [InlineData("LN(0)")]
    [InlineData("LOG(5, 1)")]
    [InlineData("PERCENTOF(1, 0)")]
    [InlineData("CLAMP(1, 5, 0)")]
    [InlineData("DIVIDE(1, 0)")]
    [InlineData("POWER(10, 1000)")]
    public void Undefined_math_is_blank(string expression) => Assert.Null(Run(expression));

    [Fact]
    public void Aggregating_functions_ignore_blanks_and_are_blank_when_nothing_is_left()
    {
        Assert.Equal(4.0, RunNumbers("SUM([A], [B], [C])", 1.0, null, 3.0));
        Assert.Equal(2.0, RunNumbers("AVERAGE([A], [B], [C])", 1.0, null, 3.0));
        Assert.Equal(1.0, RunNumbers("MIN([A], [B], [C])", 1.0, null, 3.0));
        Assert.Null(RunNumbers("SUM([A], [B], [C])", null, null, null));
    }

    private static object? RunNumbers(string expression, params double?[] values) =>
        Run(expression, values.Select((v, i) => new Col(((char)('A' + i)).ToString(), v, DatasetColumnType.Double)).ToArray());

    [Theory]
    [InlineData("UPPER(\"abc\")", "ABC")]
    [InlineData("LOWER(\"ABC\")", "abc")]
    [InlineData("PROPER(\"hELLO wORLD\")", "Hello World")]
    [InlineData("TRIM(\"  a   b  \")", "a b")]
    [InlineData("LEFT(\"abcdef\", 3)", "abc")]
    [InlineData("LEFT(\"ab\", 10)", "ab")]
    [InlineData("RIGHT(\"abcdef\", 2)", "ef")]
    [InlineData("MID(\"abcdef\", 2, 3)", "bcd")]
    [InlineData("MID(\"abc\", 2, 99)", "bc")]
    [InlineData("MID(\"abc\", 9, 1)", "")]
    [InlineData("CONCAT(\"a\", 1, TRUE)", "a1TRUE")]
    [InlineData("TEXTJOIN(\"-\", \"a\", NULL, \"b\")", "a-b")]
    [InlineData("REPLACE(\"a-b-c\", \"-\", \"\")", "abc")]
    [InlineData("REPEAT(\"ab\", 3)", "ababab")]
    [InlineData("PADLEFT(\"7\", 3, \"0\")", "007")]
    [InlineData("TEXT(3.14159, \"0.00\")", "3.14")]
    [InlineData("TEXT(42)", "42")]
    public void Text_functions(string expression, string expected) => Assert.Equal(expected, Run(expression));

    [Theory]
    [InlineData("LEN(\"abcd\")", 4.0)]
    [InlineData("FIND(\"c\", \"abcabc\")", 3.0)]
    [InlineData("FIND(\"c\", \"abcabc\", 4)", 6.0)]
    [InlineData("FIND(\"z\", \"abc\")", 0.0)]
    [InlineData("VALUE(\"12.5\")", 12.5)]
    public void Text_functions_returning_numbers(string expression, double expected) => Assert.Equal(expected, Run(expression));

    [Theory]
    [InlineData("CONTAINS(\"Hello\", \"ELL\")", true)]
    [InlineData("STARTSWITH(\"Hello\", \"he\")", true)]
    [InlineData("ENDSWITH(\"Hello\", \"LO\")", true)]
    [InlineData("CONTAINS(\"Hello\", \"z\")", false)]
    [InlineData("ISBLANK(NULL)", true)]
    [InlineData("ISBLANK(0)", false)]
    [InlineData("BETWEEN(5, 1, 10)", true)]
    [InlineData("BETWEEN(11, 1, 10)", false)]
    [InlineData("ONEOF(\"b\", \"a\", \"B\")", true)]
    [InlineData("ONEOF(3, 1, 2)", false)]
    public void Boolean_functions(string expression, bool expected) => Assert.Equal(expected, Run(expression));

    [Fact]
    public void VALUE_of_text_that_isnt_a_number_is_blank() => Assert.Null(Run("VALUE(\"abc\")"));

    [Fact]
    public void Text_builders_refuse_absurd_sizes() => Assert.Null(Run("REPEAT(\"abc\", 100000)"));

    [Fact]
    public void Date_functions()
    {
        var d = new DateTime(2026, 3, 15, 14, 30, 0);
        Assert.Equal(2026.0, Run("YEAR([D])", new Col("D", d)));
        Assert.Equal(3.0, Run("MONTH([D])", new Col("D", d)));
        Assert.Equal(15.0, Run("DAY([D])", new Col("D", d)));
        Assert.Equal(14.0, Run("HOUR([D])", new Col("D", d)));
        Assert.Equal(1.0, Run("QUARTER([D])", new Col("D", d)));
        Assert.Equal(1.0, Run("WEEKDAY([D])", new Col("D", d))); // Sunday
        Assert.Equal(11.0, Run("ISOWEEK([D])", new Col("D", d)));
        Assert.Equal(new DateTime(2026, 3, 1), Run("STARTOFMONTH([D])", new Col("D", d)));
        Assert.Equal(new DateTime(2026, 3, 31), Run("ENDOFMONTH([D])", new Col("D", d)));
        Assert.Equal(new DateTime(2026, 2, 28), Run("DATE(2026, 2, 28)"));
        Assert.Null(Run("DATE(2026, 2, 30)"));
        Assert.Equal(new DateTime(2026, 3, 25, 14, 30, 0), Run("DATEADD(\"day\", 10, [D])", new Col("D", d)));
        Assert.Equal(new DateTime(2026, 5, 15, 14, 30, 0), Run("DATEADD(\"months\", 2, [D])", new Col("D", d)));
        Assert.Equal(new DateTime(2025, 3, 15, 14, 30, 0), Run("DATEADD(\"year\", -1, [D])", new Col("D", d)));
    }

    [Fact]
    public void DATEDIFF_counts_whole_units_and_is_signed()
    {
        var a = new DateTime(2026, 1, 31);
        var b = new DateTime(2026, 3, 15);
        Assert.Equal(43.0, Run("DATEDIFF(\"day\", [A], [B])", new Col("A", a), new Col("B", b)));
        Assert.Equal(6.0, Run("DATEDIFF(\"week\", [A], [B])", new Col("A", a), new Col("B", b)));
        Assert.Equal(1.0, Run("DATEDIFF(\"month\", [A], [B])", new Col("A", a), new Col("B", b)));
        Assert.Equal(0.0, Run("DATEDIFF(\"year\", [A], [B])", new Col("A", a), new Col("B", b)));
        Assert.Equal(-43.0, Run("DATEDIFF(\"day\", [B], [A])", new Col("A", a), new Col("B", b)));
        Assert.Equal(24.0, Run("DATEDIFF(\"hour\", [A], DATEADD(\"day\", 1, [A]))", new Col("A", a)));
    }

    [Fact]
    public void An_unknown_date_unit_fails_that_row_with_a_message()
    {
        var ex = Assert.Throws<FormulaEvaluationException>(() => Run("DATEADD(\"fortnight\", 1, [D])", new Col("D", new DateTime(2026, 1, 1))));
        Assert.Contains("fortnight", ex.Message);
    }

    [Fact]
    public void IF_treats_a_blank_condition_as_false_and_COALESCE_takes_the_first_value()
    {
        Assert.Equal("no", Run("IF([B], \"yes\", \"no\")", new Col("B", null, DatasetColumnType.Bool)));
        Assert.Equal(5.0, RunNumbers("COALESCE([A], [B], [C])", null, 5.0, 7.0));
        Assert.Null(RunNumbers("COALESCE([A], [B])", null, null));
    }

    [Fact]
    public void AND_and_OR_use_three_valued_logic()
    {
        // A blank column: typed Bool so it checks, value null at run time.
        object? Logic(string expression, bool? a) =>
            new FormulaEvaluator(Catalogue).Evaluate(
                FormulaAnalyzer.Analyze(expression, [new DatasetColumn { Id = 1, Name = "A", Type = DatasetColumnType.Bool }], Catalogue),
                _ => a);

        Assert.Equal(false, Logic("[A] AND FALSE", null));
        Assert.Null(Logic("[A] AND TRUE", null));
        Assert.Equal(true, Logic("[A] OR TRUE", null));
        Assert.Null(Logic("[A] OR FALSE", null));
        Assert.Null(Logic("NOT [A]", null));
        Assert.Equal(false, Logic("NOT [A]", true));
    }

    [Fact]
    public void A_runtime_kind_mismatch_from_an_untyped_branch_fails_that_row()
    {
        // IF(...) is statically "Any" (branches differ), so ROUND accepts it — the row that takes the text branch fails.
        var columns = new[] { new DatasetColumn { Id = 1, Name = "N", Type = DatasetColumnType.Double } };
        var analysis = FormulaAnalyzer.Analyze("ROUND(IF([N] > 0, [N], \"none\"))", columns, Catalogue);
        Assert.True(analysis.IsValid, analysis.ErrorMessage);

        var evaluator = new FormulaEvaluator(Catalogue);
        Assert.Equal(3.0, evaluator.Evaluate(analysis, _ => 2.6));
        Assert.Throws<FormulaEvaluationException>(() => evaluator.Evaluate(analysis, _ => -1.0));
    }

    // --- text-level helpers ---

    [Fact]
    public void Renaming_a_column_rewrites_only_real_references()
    {
        var renamed = FormulaText.RenameColumn("[Price] * 2 & \"[Price]\" & [price]", "Price", "Cost");
        Assert.Equal("[Cost] * 2 & \"[Price]\" & [Cost]", renamed);
    }

    [Fact]
    public void Referenced_columns_are_read_from_the_token_stream()
    {
        Assert.Equal(["A", "B c"], FormulaText.ReferencedColumnNames("[A] + ROUND([B c]) & \"[Z]\""));
        Assert.Empty(FormulaText.ReferencedColumnNames("\"unterminated"));
    }

    // --- catalogue-driven availability ---

    [Fact]
    public void A_disabled_definition_makes_its_function_unavailable_to_formulas()
    {
        var (functions, parameters) = FormulaFunctionSeedData.Rows();
        var byFunction = parameters.ToLookup(p => p.FormulaFunctionDefinitionId);
        foreach (var f in functions) f.Parameters = byFunction[f.Id].ToList();
        functions.Single(f => f.Name == "ROUND").IsEnabled = false;

        var catalogue = FormulaFunctionCatalogue.Build(functions, FormulaFunctionImplementations.All);
        var analysis = FormulaAnalyzer.Analyze("ROUND(1.5)", [], catalogue);

        Assert.False(analysis.IsValid);
        Assert.Contains("disabled", analysis.ErrorMessage);
        Assert.Null(catalogue.Find("ROUND"));
    }

    [Fact]
    public void A_definition_with_no_server_implementation_is_unavailable()
    {
        var (functions, parameters) = FormulaFunctionSeedData.Rows();
        var byFunction = parameters.ToLookup(p => p.FormulaFunctionDefinitionId);
        foreach (var f in functions) f.Parameters = byFunction[f.Id].ToList();
        functions.Single(f => f.Name == "ROUND").ImplementationKey = "NO_SUCH_IMPLEMENTATION";

        var catalogue = FormulaFunctionCatalogue.Build(functions, FormulaFunctionImplementations.All);
        var analysis = FormulaAnalyzer.Analyze("ROUND(1.5)", [], catalogue);

        Assert.Contains("no implementation", analysis.ErrorMessage);
    }

    [Fact]
    public void A_definition_can_route_a_name_to_a_different_implementation_and_change_null_handling()
    {
        var (functions, parameters) = FormulaFunctionSeedData.Rows();
        var byFunction = parameters.ToLookup(p => p.FormulaFunctionDefinitionId);
        foreach (var f in functions) f.Parameters = byFunction[f.Id].ToList();
        var round = functions.Single(f => f.Name == "ROUND");
        round.ImplementationKey = "CEILING";
        round.Parameters = round.Parameters.Take(1).ToList();

        var catalogue = FormulaFunctionCatalogue.Build(functions, FormulaFunctionImplementations.All);
        var analysis = FormulaAnalyzer.Analyze("ROUND(1.2)", [], catalogue);
        Assert.Equal(2.0, new FormulaEvaluator(catalogue).Evaluate(analysis, _ => null));
    }

    [Fact]
    public void The_catalogue_dto_carries_signatures_for_the_builder()
    {
        var dto = Catalogue.ToDtos().Single(f => f.Name == "ROUND");
        Assert.Equal(FormulaFunctionCategory.Math, dto.Category);
        Assert.Equal(FormulaValueKind.Number, dto.ReturnKind);
        Assert.Equal(["number", "digits"], dto.Parameters.Select(p => p.Name));
        Assert.True(dto.Parameters[1].IsOptional);
        Assert.True(Catalogue.ToDtos().Single(f => f.Name == "SUM").Parameters.Single().IsVariadic);
    }
}
