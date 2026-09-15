using Reporting.DAL.Formulas.Ast;
using Reporting.DAL.Formulas.Functions;

namespace Reporting.DAL.Formulas;

/// <summary>Infers a formula's <see cref="FormulaStaticKind"/> without evaluating it, for the
/// save-time check in <see cref="FormulaValidator.Validate"/>.</summary>
public static class FormulaTypeChecker
{
    public static FormulaStaticKind InferKind(FormulaNode node, IReadOnlyDictionary<string, FormulaStaticKind> columnKindsByName) => node switch
    {
        NumberLiteral => FormulaStaticKind.Number,
        StringLiteral => FormulaStaticKind.String,
        BoolLiteral => FormulaStaticKind.Bool,
        ColumnReference c => columnKindsByName.GetValueOrDefault(c.ColumnName, FormulaStaticKind.Unknown),
        UnaryOperation { Operator: "-" } => FormulaStaticKind.Number,
        UnaryOperation { Operator: "NOT" } => FormulaStaticKind.Bool,
        BinaryOperation { Operator: "+" or "-" or "*" or "/" } => FormulaStaticKind.Number,
        BinaryOperation { Operator: "=" or "<>" or "<" or "<=" or ">" or ">=" or "AND" or "OR" } => FormulaStaticKind.Bool,
        FunctionCall call when string.Equals(call.Name, "IF", StringComparison.OrdinalIgnoreCase) && call.Arguments.Count == 3 =>
            InferIfKind(call, columnKindsByName),
        FunctionCall call when FormulaFunctions.All.TryGetValue(call.Name, out var def) => def.ReturnKind,
        _ => FormulaStaticKind.Unknown,
    };

    /// <summary>IF's result is whichever kind its two branches agree on — Unknown (never flagged as
    /// a mismatch) when they don't, since one branch is often a literal whose kind is ambiguous on
    /// its own (e.g. a blank string standing in for "no value").</summary>
    private static FormulaStaticKind InferIfKind(FunctionCall call, IReadOnlyDictionary<string, FormulaStaticKind> columnKindsByName)
    {
        var thenKind = InferKind(call.Arguments[1], columnKindsByName);
        var elseKind = InferKind(call.Arguments[2], columnKindsByName);
        return thenKind == elseKind ? thenKind : FormulaStaticKind.Unknown;
    }
}
