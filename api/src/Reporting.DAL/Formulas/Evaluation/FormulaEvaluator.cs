using Reporting.DAL.Formulas.Analysis;
using Reporting.DAL.Formulas.Ast;
using Reporting.DAL.Formulas.Catalogue;
using Reporting.Database;

namespace Reporting.DAL.Formulas.Evaluation;

/// <summary>
/// Runs a checked formula for one row. Blank (null) propagates through operators; a function's own
/// definition says whether it propagates through calls (<c>PropagatesNull</c>) or handles blanks itself.
/// Arguments are checked against the definition's parameter kinds before the implementation runs.
/// </summary>
public sealed class FormulaEvaluator(FormulaFunctionCatalogue catalogue)
{
    /// <param name="readColumn">Supplies a column's typed value for the current row (null when blank).</param>
    /// <exception cref="FormulaEvaluationException">The formula can't be evaluated for this row.</exception>
    public object? Evaluate(FormulaAnalysis analysis, Func<DatasetColumn, object?> readColumn)
    {
        if (analysis.Root is null)
        {
            throw new FormulaEvaluationException("The formula isn't valid.");
        }

        return FormulaValueNormalizer.Normalize(Eval(analysis.Root, analysis, readColumn));
    }

    private object? Eval(FormulaNode node, FormulaAnalysis analysis, Func<DatasetColumn, object?> read)
    {
        switch (node)
        {
            case NumberNode number:
                return number.Value;
            case TextNode text:
                return text.Value;
            case BoolNode flag:
                return flag.Value;
            case NullNode:
                return null;
            case ColumnNode column:
                return read(analysis.Bindings[column]);
            case UnaryNode unary:
                return FormulaOperators.Negate(unary.Operator, Eval(unary.Operand, analysis, read));
            case BinaryNode binary:
                return FormulaOperators.Apply(binary.Operator, Eval(binary.Left, analysis, read), Eval(binary.Right, analysis, read));
            case CallNode call:
                return Call(call, analysis, read);
            default:
                throw new FormulaEvaluationException("Unsupported expression.");
        }
    }

    private object? Call(CallNode call, FormulaAnalysis analysis, Func<DatasetColumn, object?> read)
    {
        var function = catalogue.Find(call.Name);
        if (function is null)
        {
            throw new FormulaEvaluationException(catalogue.WhyUnavailable(call.Name) ?? $"There's no function named {call.Name}.");
        }

        var args = new object?[call.Arguments.Count];
        var anyBlank = false;
        for (var i = 0; i < args.Length; i++)
        {
            var value = Eval(call.Arguments[i], analysis, read);
            RequireKind(function, i, value);
            args[i] = value;
            anyBlank |= value is null;
        }

        if (anyBlank && function.Definition.PropagatesNull)
        {
            return null;
        }

        return function.Implementation.Invoke(args);
    }

    private static void RequireKind(FormulaFunction function, int index, object? value)
    {
        var parameter = function.ParameterFor(index);
        if (FormulaValueKinds.Matches(value, parameter.Kind))
        {
            return;
        }

        throw new FormulaEvaluationException(
            $"{function.Name}'s '{parameter.Name}' needs {FormulaValueText.Describe(parameter.Kind)} but found {FormulaValueText.Describe(value)}.");
    }
}
