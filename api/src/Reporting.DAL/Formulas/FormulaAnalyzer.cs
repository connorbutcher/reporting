using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Formulas;

/// <summary>The outcome of checking a formula against a set of columns and the function catalogue.</summary>
public sealed class FormulaAnalysis
{
    public FormulaNode? Root { get; init; }

    /// <summary>The kind of value the formula produces; <see cref="FormulaValueKind.Any"/> when it can't be told statically.</summary>
    public FormulaValueKind ResultKind { get; init; } = FormulaValueKind.Any;

    /// <summary>The columns the formula reads, as the dataset names them.</summary>
    public IReadOnlyDictionary<ColumnNode, DatasetColumn> Bindings { get; init; } = new Dictionary<ColumnNode, DatasetColumn>();

    public IEnumerable<DatasetColumn> References => Bindings.Values.Distinct();

    public IReadOnlyList<FormulaErrorDto> Errors { get; init; } = [];

    public bool IsValid => Root is not null && Errors.Count == 0;

    public string ErrorMessage => string.Join(" ", Errors.Select(e => e.Message));
}

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
        FormulaNode root;
        try
        {
            root = FormulaParser.Parse(expression);
        }
        catch (FormulaSyntaxException ex)
        {
            return new FormulaAnalysis { Errors = [Error(ex.Message, ex.Position, ex.Length)] };
        }

        var checker = new Checker(columns, catalogue);
        var kind = checker.KindOf(root);

        if (declaredType is { } type && !FormulaValues.FitsColumn(kind, type))
        {
            checker.Errors.Add(Error(
                $"This formula produces {Describe(kind)}, which doesn't fit a {type} column.", root.Position, root.Length));
        }

        return new FormulaAnalysis
        {
            Root = root,
            ResultKind = kind,
            Bindings = checker.Bindings,
            Errors = checker.Errors
        };
    }

    private static FormulaErrorDto Error(string message, int position, int length) =>
        new() { Message = message, Position = position, Length = length };

    private static string Describe(FormulaValueKind kind) => kind switch
    {
        FormulaValueKind.Number => "a number",
        FormulaValueKind.Text => "text",
        FormulaValueKind.Bool => "a true/false value",
        FormulaValueKind.Date => "a date",
        _ => "a value"
    };

    private sealed class Checker(IReadOnlyCollection<DatasetColumn> columns, FormulaFunctionCatalogue catalogue)
    {
        private readonly ILookup<string, DatasetColumn> _columnsByName =
            columns.ToLookup(c => c.Name, StringComparer.OrdinalIgnoreCase);

        private readonly Dictionary<ColumnNode, DatasetColumn> _bindings = new();

        public List<FormulaErrorDto> Errors { get; } = [];

        public IReadOnlyDictionary<ColumnNode, DatasetColumn> Bindings => _bindings;

        public FormulaValueKind KindOf(FormulaNode node) => node switch
        {
            NumberNode => FormulaValueKind.Number,
            TextNode => FormulaValueKind.Text,
            BoolNode => FormulaValueKind.Bool,
            NullNode => FormulaValueKind.Any,
            ColumnNode column => ColumnKind(column),
            UnaryNode unary => UnaryKind(unary),
            BinaryNode binary => BinaryKind(binary),
            CallNode call => CallKind(call),
            _ => FormulaValueKind.Any
        };

        private FormulaValueKind ColumnKind(ColumnNode node)
        {
            var matches = _columnsByName[node.Name].ToList();
            if (matches.Count == 0)
            {
                Errors.Add(Error($"There's no column named [{node.Name}].", node.Position, node.Length));
                return FormulaValueKind.Any;
            }

            if (matches.Count > 1)
            {
                Errors.Add(Error($"More than one column is named [{node.Name}], so it can't be referenced.", node.Position, node.Length));
                return FormulaValueKind.Any;
            }

            _bindings[node] = matches[0];
            return FormulaValues.KindOf(matches[0].Type);
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

                case "=" or "<>":
                {
                    var left = KindOf(node.Left);
                    var right = KindOf(node.Right);
                    if (left != FormulaValueKind.Any && right != FormulaValueKind.Any && left != right)
                        Errors.Add(Error($"Can't compare {Describe(left)} with {Describe(right)}.", node.Position, node.Length));
                    return FormulaValueKind.Bool;
                }

                case "<" or "<=" or ">" or ">=":
                {
                    var left = KindOf(node.Left);
                    var right = KindOf(node.Right);
                    if (left != FormulaValueKind.Any && right != FormulaValueKind.Any && left != right)
                        Errors.Add(Error($"Can't compare {Describe(left)} with {Describe(right)}.", node.Position, node.Length));
                    else if (left == FormulaValueKind.Bool || right == FormulaValueKind.Bool)
                        Errors.Add(Error($"'{node.Operator}' can't order true/false values.", node.Position, node.Length));
                    return FormulaValueKind.Bool;
                }

                default: // + - * / % ^
                    Expect(node.Left, FormulaValueKind.Number, $"'{node.Operator}' needs numbers");
                    Expect(node.Right, FormulaValueKind.Number, $"'{node.Operator}' needs numbers");
                    return FormulaValueKind.Number;
            }
        }

        private FormulaValueKind CallKind(CallNode call)
        {
            var function = catalogue.Find(call.Name);
            if (function is null)
            {
                Errors.Add(Error(
                    catalogue.WhyUnavailable(call.Name) ?? $"There's no function named {call.Name}.",
                    call.NamePosition,
                    call.NameLength));

                foreach (var argument in call.Arguments) KindOf(argument);
                return FormulaValueKind.Any;
            }

            var count = call.Arguments.Count;
            if (count < function.MinArguments || (function.MaxArguments is { } max && count > max))
            {
                Errors.Add(Error(
                    $"{function.Signature} {ArityText(function)}, but {count} {(count == 1 ? "was" : "were")} given.",
                    call.Position,
                    call.Length));
            }

            var argumentKinds = new List<FormulaValueKind>();
            for (var i = 0; i < count; i++)
            {
                var kind = KindOf(call.Arguments[i]);
                argumentKinds.Add(kind);

                if (i >= function.Parameters.Count && function.MaxArguments is not null) continue; // already reported

                var parameter = function.ParameterFor(i);
                if (parameter.Kind != FormulaValueKind.Any && kind != FormulaValueKind.Any && kind != parameter.Kind)
                {
                    Errors.Add(Error(
                        $"{function.Name}'s '{parameter.Name}' needs {Describe(parameter.Kind)}, but this is {Describe(kind)}.",
                        call.Arguments[i].Position,
                        call.Arguments[i].Length));
                }
            }

            var returns = function.Definition.ReturnKind;
            return returns == FormulaValueKind.Any ? CommonKind(function, call, argumentKinds) : returns;
        }

        /// <summary>For a function that returns whatever its <c>Any</c> arguments are (IF, COALESCE): their shared kind, or Any if they differ.</summary>
        private static FormulaValueKind CommonKind(FormulaFunction function, CallNode call, List<FormulaValueKind> argumentKinds)
        {
            FormulaValueKind? common = null;
            for (var i = 0; i < argumentKinds.Count; i++)
            {
                if (i >= function.Parameters.Count && function.MaxArguments is not null) break;
                if (function.ParameterFor(i).Kind != FormulaValueKind.Any) continue;
                if (call.Arguments[i] is NullNode || argumentKinds[i] == FormulaValueKind.Any) continue;

                if (common is null) common = argumentKinds[i];
                else if (common != argumentKinds[i]) return FormulaValueKind.Any;
            }

            return common ?? FormulaValueKind.Any;
        }

        private static string ArityText(FormulaFunction function)
        {
            var min = function.MinArguments;
            return function.MaxArguments switch
            {
                null => $"takes at least {min} argument{(min == 1 ? "" : "s")}",
                var max when max == min => $"takes {min} argument{(min == 1 ? "" : "s")}",
                var max => $"takes {min} to {max} arguments"
            };
        }

        private void Expect(FormulaNode node, FormulaValueKind expected, string message)
        {
            var kind = KindOf(node);
            if (kind != FormulaValueKind.Any && kind != expected)
                Errors.Add(Error($"{message}, but this is {Describe(kind)}.", node.Position, node.Length));
        }
    }
}
