using Reporting.Abstractions;
using Reporting.DAL.Formulas.Analysis;
using Reporting.DAL.Formulas.Catalogue;
using Reporting.DAL.Formulas.Evaluation;
using Reporting.Database;

namespace Reporting.Tests.Formulas;

/// <summary>Runs formulas in memory against the seeded catalogue: the common ground of the formula language and function tests.</summary>
public static class FormulaTestHarness
{
    public static FormulaFunctionCatalogue Catalogue { get; } = FormulaFunctionCatalogue.Default;

    /// <summary>Evaluates an expression over named column values (a blank is null); fails the test if the formula doesn't check.</summary>
    public static object? Run(string expression, params FormulaTestInput[] inputs)
    {
        var columns = new List<DatasetColumn>(inputs.Length);
        for (var i = 0; i < inputs.Length; i++)
        {
            columns.Add(new DatasetColumn { Id = i + 1, Name = inputs[i].Name, Type = inputs[i].Type ?? TypeOf(inputs[i].Value) });
        }

        var analysis = FormulaAnalyzer.Analyze(expression, columns, Catalogue);
        Assert.True(analysis.IsValid, $"'{expression}' should be valid but: {analysis.ErrorMessage}");

        return new FormulaEvaluator(Catalogue).Evaluate(analysis, column => inputs[column.Id - 1].Value);
    }

    /// <summary>Evaluates over number columns named A, B, C… holding the given values (null for blank).</summary>
    public static object? RunNumbers(string expression, params double?[] values)
    {
        var inputs = new FormulaTestInput[values.Length];
        for (var i = 0; i < values.Length; i++)
        {
            inputs[i] = new FormulaTestInput(((char)('A' + i)).ToString(), values[i], DatasetColumnType.Double);
        }

        return Run(expression, inputs);
    }

    /// <summary>Evaluates over one true/false column named A holding the given value (null for blank).</summary>
    public static object? RunWithFlag(string expression, bool? flag)
    {
        return Run(expression, new FormulaTestInput("A", flag, DatasetColumnType.Bool));
    }

    /// <summary>Checks a formula against named, typed columns without running it.</summary>
    public static FormulaAnalysis Check(string expression, params (string Name, DatasetColumnType Type)[] columns)
    {
        var list = new List<DatasetColumn>(columns.Length);
        for (var i = 0; i < columns.Length; i++)
        {
            list.Add(new DatasetColumn { Id = i + 1, Name = columns[i].Name, Type = columns[i].Type });
        }

        return FormulaAnalyzer.Analyze(expression, list, Catalogue);
    }

    /// <summary>The seeded function definitions with their parameters attached, ready to be changed and built into a catalogue.</summary>
    public static List<FormulaFunctionDefinition> SeededDefinitions()
    {
        var (functions, parameters) = FormulaFunctionSeedData.Rows();
        var byFunction = parameters.ToLookup(p => p.FormulaFunctionDefinitionId);
        foreach (var function in functions)
        {
            function.Parameters = byFunction[function.Id].ToList();
        }

        return functions;
    }

    public static DatasetColumnType TypeOf(object? value)
    {
        switch (value)
        {
            case double:
                return DatasetColumnType.Double;
            case bool:
                return DatasetColumnType.Bool;
            case DateTime:
                return DatasetColumnType.DateTime;
            default:
                return DatasetColumnType.String;
        }
    }
}
