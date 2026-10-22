using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>What a column type change newly breaks: references that work on the old type but not the new one.</summary>
internal sealed class TypeChangeBreaks(
    DatasetColumnType oldType,
    DatasetColumnType newType,
    IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>>? catalogue)
{
    public List<string> For(IEnumerable<ColumnReference> references)
    {
        return references
            .SelectMany(NewReasons)
            .Distinct()
            .ToList();
    }

    private IEnumerable<string> NewReasons(ColumnReference reference)
    {
        var before = Reasons(reference, oldType, catalogue).Select(x => x.Key).ToHashSet();
        return Reasons(reference, newType, catalogue).Where(x => !before.Contains(x.Key)).Select(x => x.Message);
    }

    /// <summary>A measure that needs a number, an operator the type doesn't offer, or an operand that doesn't parse.</summary>
    private static IEnumerable<BreakReason> Reasons(
        ColumnReference reference, DatasetColumnType type, IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>>? catalogue)
    {
        if (reference.NeedsNumber && type is not (DatasetColumnType.Int or DatasetColumnType.Double))
        {
            yield return new BreakReason("needsNumber", $"{reference.Role} needs a number");
        }

        // An unknown operator isn't a type problem.
        if (reference.Condition is not { } condition
            || !Enum.TryParse<FilterOperator>(condition.Operator, ignoreCase: true, out var op))
        {
            yield break;
        }

        var supported = FilterOperators.Find(type, op, catalogue);
        if (supported is null)
        {
            yield return new BreakReason($"operator:{op}", $"Filter condition \"{OperatorLabel(op, catalogue)}\" can't be used on {TypeName(type)} columns");
            yield break;
        }

        if (supported.OperandKind != FilterOperandKind.List && condition.Values.Count < supported.OperandCount)
        {
            yield return new BreakReason($"operands:{op}", $"Filter condition \"{supported.Label}\" needs {supported.OperandCount} value(s)");
            yield break;
        }

        foreach (var reason in OperandReasons(condition.Values, supported, op))
        {
            yield return reason;
        }
    }

    /// <summary>Operands are stored as text and parsed against the column's type when the filter runs.</summary>
    private static IEnumerable<BreakReason> OperandReasons(IReadOnlyList<string> values, FilterOperatorDto supported, FilterOperator op)
    {
        foreach (var value in values.Take(Math.Max(supported.OperandCount, 0)))
        {
            var (kind, valid) = supported.OperandKind switch
            {
                FilterOperandKind.Number => ("number", CellValues.TryParseNumber(value, out _)),
                FilterOperandKind.Date => ("date", CellValues.TryParseDate(value, out _)),
                _ => ("", true),
            };
            if (!valid)
            {
                yield return new BreakReason($"operand:{op}:{value}:{kind}", $"Filter condition value \"{value}\" isn't a {kind}");
            }
        }
    }

    private static string OperatorLabel(FilterOperator op, IReadOnlyDictionary<DatasetColumnType, IReadOnlyList<FilterOperatorDto>>? catalogue)
    {
        return Enum.GetValues<DatasetColumnType>()
            .Select(t => FilterOperators.Find(t, op, catalogue))
            .FirstOrDefault(o => o is not null)?.Label ?? op.ToString();
    }

    /// <summary>The type as the dataset editor names it.</summary>
    private static string TypeName(DatasetColumnType type)
    {
        return type switch
        {
            DatasetColumnType.String => "text",
            DatasetColumnType.Int => "whole-number",
            DatasetColumnType.Double => "decimal",
            DatasetColumnType.Bool => "yes/no",
            DatasetColumnType.DateTime => "date",
            _ => type.ToString(),
        };
    }
}
