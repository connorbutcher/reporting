using Reporting.Abstractions;
using Reporting.DAL.Formulas.Ast;
using Reporting.DAL.Formulas.Functions;
using Reporting.Database;

namespace Reporting.DAL.Formulas;

/// <summary>
/// Save-time validation: parses a formula and checks it holds together against a dataset's
/// schema — every <c>[Column]</c> reference resolves, every function call is known with the right
/// argument count, it doesn't reference its own column, and its inferred shape matches the declared
/// result type. Pure — operates only on already-loaded <see cref="DatasetColumn"/> objects, no
/// database access, so callers (<c>DatasetFormulaRepository</c>) own when this runs relative to I/O.
/// </summary>
public static class FormulaValidator
{
    /// <summary>Throws <see cref="FormulaParseException"/> or <see cref="FormulaValidationException"/>;
    /// never mutates anything.</summary>
    public static FormulaValidationResult Validate(
        string expression,
        DatasetColumnType resultType,
        IReadOnlyList<DatasetColumn> datasetColumns,
        Guid? editingColumnRef)
    {
        var ast = FormulaParser.Parse(expression);
        var referenced = FormulaParser.ReferencedColumnNames(ast);

        var columnsByName = new Dictionary<string, DatasetColumn>(StringComparer.OrdinalIgnoreCase);
        foreach (var column in datasetColumns) columnsByName.TryAdd(column.Name, column);

        foreach (var name in referenced)
        {
            if (!columnsByName.TryGetValue(name, out var column))
                throw new FormulaValidationException($"Unknown column '{name}'.");
            if (editingColumnRef is { } refId && column.RefId == refId)
                throw new FormulaValidationException("A formula can't reference its own column.");
        }

        CheckCalls(ast);

        var columnKinds = datasetColumns.ToDictionary(
            c => c.Name,
            c => FormulaStaticKinds.ForColumnType(c.Type),
            StringComparer.OrdinalIgnoreCase);
        var inferredKind = FormulaTypeChecker.InferKind(ast, columnKinds);
        var expectedKind = FormulaStaticKinds.ForColumnType(resultType);
        if (inferredKind != FormulaStaticKind.Unknown && inferredKind != expectedKind)
        {
            throw new FormulaValidationException(
                $"This formula looks like it produces a {inferredKind}, but the column's result type is {expectedKind}.");
        }

        return new FormulaValidationResult(ast, referenced);
    }

    /// <summary>Arity/name-checks every function call in the tree — <see cref="FormulaEvaluator"/>
    /// checks the same thing per row, but catching it once here gives a save-time error instead of
    /// a column full of null cells.</summary>
    private static void CheckCalls(FormulaNode node)
    {
        switch (node)
        {
            case FunctionCall call when string.Equals(call.Name, "IF", StringComparison.OrdinalIgnoreCase):
                if (call.Arguments.Count != 3)
                    throw new FormulaValidationException("'IF' takes 3 arguments (condition, then, else).");
                foreach (var arg in call.Arguments) CheckCalls(arg);
                break;

            case FunctionCall call:
                if (!FormulaFunctions.All.TryGetValue(call.Name, out var def))
                    throw new FormulaValidationException($"Unknown function '{call.Name}'.");
                if (call.Arguments.Count < def.MinArgs || call.Arguments.Count > def.MaxArgs)
                {
                    var arity = def.MinArgs == def.MaxArgs ? $"{def.MinArgs}" : $"{def.MinArgs}-{def.MaxArgs}";
                    throw new FormulaValidationException($"'{call.Name}' takes {arity} argument(s), not {call.Arguments.Count}.");
                }
                foreach (var arg in call.Arguments) CheckCalls(arg);
                break;

            case UnaryOperation u:
                CheckCalls(u.Operand);
                break;

            case BinaryOperation b:
                CheckCalls(b.Left);
                CheckCalls(b.Right);
                break;
        }
    }
}
