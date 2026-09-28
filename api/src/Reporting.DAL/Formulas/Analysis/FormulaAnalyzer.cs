using Reporting.Abstractions;
using Reporting.DAL.Formulas.Ast;
using Reporting.DAL.Formulas.Catalogue;
using Reporting.DAL.Formulas.Evaluation;
using Reporting.DAL.Formulas.Syntax;
using Reporting.Database;

namespace Reporting.DAL.Formulas.Analysis;

/// <summary>
/// Checks a formula before it runs: it parses, every column and function it names exists, each call has an
/// acceptable number of arguments of acceptable kinds, and the result suits the column it will fill. All the
/// function knowledge (arity, parameter and return kinds) comes from the catalogue, not from code here.
/// </summary>
public static class FormulaAnalyzer
{
    /// <param name="columns">The columns a formula may reference.</param>
    /// <param name="declaredType">The type of the column the result will fill, if it has been chosen.</param>
    public static FormulaAnalysis Analyze(
        string expression,
        IReadOnlyCollection<DatasetColumn> columns,
        FormulaFunctionCatalogue catalogue,
        DatasetColumnType? declaredType = null)
    {
        return Analyze(expression, new FormulaColumnIndex(columns), catalogue, declaredType);
    }

    /// <summary>As above, against columns already indexed — for checking several formulas against one dataset.</summary>
    public static FormulaAnalysis Analyze(
        string expression,
        FormulaColumnIndex columns,
        FormulaFunctionCatalogue catalogue,
        DatasetColumnType? declaredType = null)
    {
        FormulaNode root;
        try
        {
            root = FormulaParser.Parse(expression);
        }
        catch (FormulaSyntaxException ex)
        {
            return new FormulaAnalysis { Errors = [FormulaErrors.At(ex.Message, ex.Position, ex.Length)] };
        }

        var checker = new FormulaTypeChecker(columns, catalogue);
        var kind = checker.KindOf(root);

        if (declaredType is { } type && !FormulaValueKinds.FitsColumn(kind, type))
        {
            checker.Errors.Add(FormulaErrors.At(
                $"This formula produces {FormulaValueText.Describe(kind)}, which doesn't fit a {type} column.", root.Position, root.Length));
        }

        return new FormulaAnalysis
        {
            Root = root,
            ResultKind = kind,
            Bindings = checker.Bindings,
            Errors = checker.Errors
        };
    }
}
