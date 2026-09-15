using Reporting.Abstractions;
using Reporting.DAL.Formulas;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>Exercises <see cref="FormulaValidator"/>, <see cref="FormulaDependencyGraph"/>, and
/// <see cref="FormulaColumnRename"/> — all pure in-memory logic over <see cref="DatasetColumn"/>, no
/// database.</summary>
public class FormulaColumnsTests
{
    private static DatasetColumn Column(string name, DatasetColumnType type, bool computed = false, string? expression = null) => new()
    {
        Id = Math.Abs(name.GetHashCode()) % 100000 + 1, // stable-but-arbitrary, distinct per name for these tests
        RefId = Guid.NewGuid(),
        Name = name,
        Type = type,
        IsComputed = computed,
        FormulaExpression = expression,
    };

    [Fact]
    public void Validate_accepts_a_formula_matching_its_declared_type()
    {
        var columns = new List<DatasetColumn> { Column("Measured", DatasetColumnType.Double), Column("Nominal", DatasetColumnType.Double) };

        var result = FormulaValidator.Validate("[Measured] - [Nominal]", DatasetColumnType.Double, columns, editingColumnRef: null);

        Assert.Equal(new HashSet<string> { "Measured", "Nominal" }, result.DependsOnColumnNames);
    }

    [Fact]
    public void Validate_rejects_an_unknown_column()
    {
        var columns = new List<DatasetColumn> { Column("Measured", DatasetColumnType.Double) };

        Assert.Throws<FormulaValidationException>(() =>
            FormulaValidator.Validate("[Nope] + 1", DatasetColumnType.Double, columns, editingColumnRef: null));
    }

    [Fact]
    public void Validate_rejects_a_formula_referencing_its_own_column()
    {
        var self = Column("Deviation", DatasetColumnType.Double, computed: true);
        var columns = new List<DatasetColumn> { self };

        Assert.Throws<FormulaValidationException>(() =>
            FormulaValidator.Validate("[Deviation] + 1", DatasetColumnType.Double, columns, editingColumnRef: self.RefId));
    }

    [Fact]
    public void Validate_rejects_an_obvious_type_mismatch()
    {
        var columns = new List<DatasetColumn> { Column("Measured", DatasetColumnType.Double) };

        // A comparison produces a bool, not the declared Double result type.
        var ex = Assert.Throws<FormulaValidationException>(() =>
            FormulaValidator.Validate("[Measured] > 1", DatasetColumnType.Double, columns, editingColumnRef: null));
        Assert.Contains("Bool", ex.Message);
    }

    [Fact]
    public void Validate_allows_an_if_with_matching_branches()
    {
        var columns = new List<DatasetColumn> { Column("Pass", DatasetColumnType.Bool) };

        // Both branches are numbers, so IF's inferred kind is Number — matches the Double result type.
        FormulaValidator.Validate("IF([Pass], 1, 0)", DatasetColumnType.Double, columns, editingColumnRef: null);
    }

    [Fact]
    public void Validate_rejects_an_unknown_function()
    {
        Assert.Throws<FormulaValidationException>(() =>
            FormulaValidator.Validate("NOPE(1)", DatasetColumnType.Double, [], editingColumnRef: null));
    }

    [Fact]
    public void Dependency_graph_only_has_edges_between_computed_columns()
    {
        var plain = Column("Measured", DatasetColumnType.Double);
        var formula = Column("Deviation", DatasetColumnType.Double, computed: true, expression: "[Measured] - 1");
        var columns = new List<DatasetColumn> { plain, formula };

        var graph = FormulaDependencyGraph.Build(columns);

        Assert.Single(graph);
        Assert.Empty(graph[formula.RefId]); // Measured isn't computed, so it's not an edge
    }

    [Fact]
    public void Topological_order_puts_a_dependency_before_its_dependent()
    {
        var a = Column("A", DatasetColumnType.Double, computed: true, expression: "1");
        var b = Column("B", DatasetColumnType.Double, computed: true, expression: "[A] + 1");
        var columns = new List<DatasetColumn> { a, b };

        var order = FormulaDependencyGraph.TopologicalOrder(FormulaDependencyGraph.Build(columns));

        Assert.Equal([a.RefId, b.RefId], order);
    }

    [Fact]
    public void A_two_column_cycle_is_rejected()
    {
        var a = Column("A", DatasetColumnType.Double, computed: true, expression: "[B] + 1");
        var b = Column("B", DatasetColumnType.Double, computed: true, expression: "[A] + 1");
        var columns = new List<DatasetColumn> { a, b };

        Assert.Throws<FormulaValidationException>(() =>
            FormulaDependencyGraph.TopologicalOrder(FormulaDependencyGraph.Build(columns)));
    }

    [Fact]
    public void Dependent_column_names_finds_formulas_referencing_the_target()
    {
        var measured = Column("Measured", DatasetColumnType.Double);
        var deviation = Column("Deviation", DatasetColumnType.Double, computed: true, expression: "[Measured] - 1");
        var unrelated = Column("Other", DatasetColumnType.Double, computed: true, expression: "1 + 1");
        var columns = new List<DatasetColumn> { measured, deviation, unrelated };

        var dependents = FormulaColumnRename.DependentColumnNames(measured, columns);

        Assert.Equal(["Deviation"], dependents);
    }

    [Fact]
    public void Rename_rewrites_bracket_references_in_dependent_formulas()
    {
        var deviation = Column("Deviation", DatasetColumnType.Double, computed: true, expression: "[Measured] - [Nominal]");
        var columns = new List<DatasetColumn> { deviation };

        var changed = FormulaColumnRename.RenameReferences(columns, "Measured", "Actual Diameter");

        Assert.Equal([deviation], changed);
        Assert.Equal("[Actual Diameter] - [Nominal]", deviation.FormulaExpression);
    }

    [Fact]
    public void Rename_is_case_insensitive_and_only_touches_the_matching_name()
    {
        var deviation = Column("Deviation", DatasetColumnType.Double, computed: true, expression: "[measured] - [Measured Range]");
        var columns = new List<DatasetColumn> { deviation };

        FormulaColumnRename.RenameReferences(columns, "Measured", "Actual");

        // "[measured]" (case-insensitive match) is rewritten; "[Measured Range]" is a different
        // column name entirely and must be left alone.
        Assert.Equal("[Actual] - [Measured Range]", deviation.FormulaExpression);
    }
}
