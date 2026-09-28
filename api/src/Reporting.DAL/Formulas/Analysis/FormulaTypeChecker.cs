using Reporting.Abstractions;
using Reporting.DAL.Formulas.Ast;
using Reporting.DAL.Formulas.Catalogue;
using Reporting.DAL.Formulas.Evaluation;
using Reporting.Database;

namespace Reporting.DAL.Formulas.Analysis;

/// <summary>
/// Walks a parsed formula working out the kind of value each part produces, and collecting the problems it
/// meets — unknown or ambiguous columns, unknown functions, wrong argument counts and kinds — rather than
/// stopping at the first. Also records which column each reference resolved to.
/// </summary>
public sealed class FormulaTypeChecker(FormulaColumnIndex columns, FormulaFunctionCatalogue catalogue)
{
    private readonly Dictionary<ColumnNode, DatasetColumn> _bindings = new();

    public List<FormulaErrorDto> Errors { get; } = [];

    public IReadOnlyDictionary<ColumnNode, DatasetColumn> Bindings
    {
        get
        {
            return _bindings;
        }
    }

    public FormulaValueKind KindOf(FormulaNode node)
    {
        switch (node)
        {
            case NumberNode:
                return FormulaValueKind.Number;
            case TextNode:
                return FormulaValueKind.Text;
            case BoolNode:
                return FormulaValueKind.Bool;
            case ColumnNode column:
                return ColumnKind(column);
            case UnaryNode unary:
                return UnaryKind(unary);
            case BinaryNode binary:
                return BinaryKind(binary);
            case CallNode call:
                return CallKind(call);
            default:
                return FormulaValueKind.Any; // NULL, and anything not known
        }
    }

    private FormulaValueKind ColumnKind(ColumnNode node)
    {
        var matches = columns.Named(node.Name);
        if (matches.Count == 0)
        {
            Errors.Add(FormulaErrors.At($"There's no column named [{node.Name}].", node.Position, node.Length));
            return FormulaValueKind.Any;
        }

        if (matches.Count > 1)
        {
            Errors.Add(FormulaErrors.At($"More than one column is named [{node.Name}], so it can't be referenced.", node.Position, node.Length));
            return FormulaValueKind.Any;
        }

        _bindings[node] = matches[0];
        return FormulaValueKinds.KindOf(matches[0].Type);
    }

    private FormulaValueKind UnaryKind(UnaryNode node)
    {
        Expect(node.Operand, FormulaValueKind.Number, $"'{node.Operator}' needs a number");
        return FormulaValueKind.Number;
    }

    private FormulaValueKind BinaryKind(BinaryNode node)
    {
        switch (node.Operator)
        {
            case "&":
                KindOf(node.Left);
                KindOf(node.Right);
                return FormulaValueKind.Text;

            case "=":
            case "<>":
                CheckComparable(node, orderingOperator: false);
                return FormulaValueKind.Bool;

            case "<":
            case "<=":
            case ">":
            case ">=":
                CheckComparable(node, orderingOperator: true);
                return FormulaValueKind.Bool;

            default: // + - * / % ^
                Expect(node.Left, FormulaValueKind.Number, $"'{node.Operator}' needs numbers");
                Expect(node.Right, FormulaValueKind.Number, $"'{node.Operator}' needs numbers");
                return FormulaValueKind.Number;
        }
    }

    /// <summary>Both sides of a comparison must be the same kind, and only ordered kinds may be ordered.</summary>
    private void CheckComparable(BinaryNode node, bool orderingOperator)
    {
        var left = KindOf(node.Left);
        var right = KindOf(node.Right);

        if (left != FormulaValueKind.Any && right != FormulaValueKind.Any && left != right)
        {
            Errors.Add(FormulaErrors.At(
                $"Can't compare {FormulaValueText.Describe(left)} with {FormulaValueText.Describe(right)}.", node.Position, node.Length));
        }
        else if (orderingOperator && (left == FormulaValueKind.Bool || right == FormulaValueKind.Bool))
        {
            Errors.Add(FormulaErrors.At($"'{node.Operator}' can't order true/false values.", node.Position, node.Length));
        }
    }

    private FormulaValueKind CallKind(CallNode call)
    {
        var function = catalogue.Find(call.Name);
        if (function is null)
        {
            Errors.Add(FormulaErrors.At(
                catalogue.WhyUnavailable(call.Name) ?? $"There's no function named {call.Name}.",
                call.NamePosition,
                call.NameLength));

            foreach (var argument in call.Arguments)
            {
                KindOf(argument);
            }

            return FormulaValueKind.Any;
        }

        CheckArgumentCount(call, function);
        var argumentKinds = CheckArguments(call, function);

        var returns = function.Definition.ReturnKind;
        return returns == FormulaValueKind.Any ? CommonKind(function, call, argumentKinds) : returns;
    }

    private void CheckArgumentCount(CallNode call, FormulaFunction function)
    {
        var count = call.Arguments.Count;
        if (count >= function.MinArguments && (function.MaxArguments is not { } max || count <= max))
        {
            return;
        }

        Errors.Add(FormulaErrors.At(
            $"{function.Signature} {ArityText(function)}, but {count} {(count == 1 ? "was" : "were")} given.",
            call.Position,
            call.Length));
    }

    /// <summary>Checks each argument's kind against its parameter's, returning the kinds found.</summary>
    private List<FormulaValueKind> CheckArguments(CallNode call, FormulaFunction function)
    {
        var kinds = new List<FormulaValueKind>(call.Arguments.Count);
        for (var i = 0; i < call.Arguments.Count; i++)
        {
            var argument = call.Arguments[i];
            var kind = KindOf(argument);
            kinds.Add(kind);

            if (i >= function.Parameters.Count && function.MaxArguments is not null)
            {
                continue; // too many arguments: already reported
            }

            var parameter = function.ParameterFor(i);
            if (parameter.Kind != FormulaValueKind.Any && kind != FormulaValueKind.Any && kind != parameter.Kind)
            {
                Errors.Add(FormulaErrors.At(
                    $"{function.Name}'s '{parameter.Name}' needs {FormulaValueText.Describe(parameter.Kind)}, but this is {FormulaValueText.Describe(kind)}.",
                    argument.Position,
                    argument.Length));
            }
        }

        return kinds;
    }

    /// <summary>For a function that returns whatever its <c>Any</c> arguments are (IF, COALESCE): their shared kind, or <c>Any</c> if they differ.</summary>
    private static FormulaValueKind CommonKind(FormulaFunction function, CallNode call, List<FormulaValueKind> argumentKinds)
    {
        FormulaValueKind? common = null;
        for (var i = 0; i < argumentKinds.Count; i++)
        {
            if (i >= function.Parameters.Count && function.MaxArguments is not null)
            {
                break;
            }

            if (function.ParameterFor(i).Kind != FormulaValueKind.Any)
            {
                continue;
            }

            if (call.Arguments[i] is NullNode || argumentKinds[i] == FormulaValueKind.Any)
            {
                continue;
            }

            if (common is null)
            {
                common = argumentKinds[i];
            }
            else if (common != argumentKinds[i])
            {
                return FormulaValueKind.Any;
            }
        }

        return common ?? FormulaValueKind.Any;
    }

    private static string ArityText(FormulaFunction function)
    {
        var min = function.MinArguments;
        var plural = min == 1 ? string.Empty : "s";

        if (function.MaxArguments is not { } max)
        {
            return $"takes at least {min} argument{plural}";
        }

        return max == min ? $"takes {min} argument{plural}" : $"takes {min} to {max} arguments";
    }

    private void Expect(FormulaNode node, FormulaValueKind expected, string message)
    {
        var kind = KindOf(node);
        if (kind != FormulaValueKind.Any && kind != expected)
        {
            Errors.Add(FormulaErrors.At($"{message}, but this is {FormulaValueText.Describe(kind)}.", node.Position, node.Length));
        }
    }
}
