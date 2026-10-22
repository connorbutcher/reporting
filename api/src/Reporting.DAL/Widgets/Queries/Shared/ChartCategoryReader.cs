using System.Globalization;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Reads a grouping chart's category column: turns a cell's typed values into a <see cref="ChartCategory"/>
/// (bucketing a date by period when asked), orders categories naturally, labels them, and expresses
/// one as filter conditions for drill-through. Shared by bar/combination, box plot and Xbar-R.
/// </summary>
public sealed class ChartCategoryReader(DatasetColumn column, DateGrouping? grouping)
{
    public DatasetColumn Column { get; } = column;

    /// <summary>The period a date category is bucketed by; null for any other column, or exact dates.</summary>
    public DateGrouping? Grouping { get; } = column.Type == DatasetColumnType.DateTime ? grouping : null;

    private bool Numeric => Column.Type is DatasetColumnType.Int or DatasetColumnType.Double;
    private bool IsDate => Column.Type is DatasetColumnType.DateTime;

    /// <summary>The category a cell belongs to, from its stored text and typed values.</summary>
    public ChartCategory Read(string? text, double? number, DateTime? date)
    {
        if (Numeric)
        {
            return number is { } n ? new ChartCategory(n.ToString("R", CultureInfo.InvariantCulture), n, null, null) : ChartCategory.Blank;
        }
        if (IsDate)
        {
            if (date is not { } d)
            {
                return ChartCategory.Blank;
            }
            if (Grouping is { } period)
            {
                var (start, end, _) = PivotField.Period(d, period);
                return new ChartCategory(start.ToString("o", CultureInfo.InvariantCulture), null, start, end);
            }
            return new ChartCategory(d.ToString("o", CultureInfo.InvariantCulture), null, d, null);
        }
        if (Column.Type == DatasetColumnType.Bool)
        {
            return CellValues.TryParseBool(text, out var flag) ? new ChartCategory(flag ? "True" : "False", null, null, null) : ChartCategory.Blank;
        }

        var trimmed = (text ?? "").Trim();
        return trimmed.Length == 0 ? ChartCategory.Blank : new ChartCategory(trimmed, null, null, null);
    }

    /// <summary>
    /// The column's own order: numerically/chronologically for numeric and date columns, alphabetically
    /// otherwise, with the blank category last and "Other" after it.
    /// </summary>
    public List<ChartCategory> NaturalOrder(IEnumerable<ChartCategory> categories)
    {
        var distinct = categories.DistinctBy(c => c.Key).ToList();
        var real = distinct.Where(c => !c.IsBlank && !c.IsOther);
        var ordered = Numeric ? real.OrderBy(c => c.Number)
            : IsDate ? real.OrderBy(c => c.Date)
            : real.OrderBy(c => c.Key, StringComparer.OrdinalIgnoreCase);
        return ordered
            .Concat(distinct.Where(c => c.IsBlank))
            .Concat(distinct.Where(c => c.IsOther))
            .ToList();
    }

    /// <summary>The axis label: a period's name, a formatted number or date, the text itself, "(blank)" or "Other".</summary>
    public string Label(ChartCategory category)
    {
        if (category.IsOther)
        {
            return "Other";
        }
        if (category.IsBlank)
        {
            return "(blank)";
        }
        if (category.Date is { } date)
        {
            return Grouping is { } period
                ? PivotField.Period(date, period).Display
                : CellFormatter.Date(date, Column.GetConfig() as DateColumnConfig);
        }
        if (category.Number is { } number)
        {
            return CellFormatter.Number(number, Column.GetConfig() as NumericColumnConfig);
        }
        return category.Key;
    }

    /// <summary>The client-facing detail for a category: its natural sort key and drill-through conditions.</summary>
    public ChartCategoryDto Detail(ChartCategory category) => new()
    {
        SortNumber = category.Number ?? (category.Date is { } date ? (date - DateTime.UnixEpoch).TotalMilliseconds : null),
        SortText = category.Number is null && category.Date is null && !category.IsBlank && !category.IsOther ? category.Key : null,
        IsBlank = category.IsBlank,
        IsOther = category.IsOther,
        Drill = Drill(category)
    };

    /// <summary>Conditions selecting exactly the rows in <paramref name="category"/>; null for "Other".</summary>
    public FilterGroupDto? Drill(ChartCategory category)
    {
        var columnId = Column.RefId;

        List<FilterNodeDto> conditions;
        if (category.IsOther)
        {
            return null;
        }
        if (category.IsBlank)
        {
            conditions = [Condition(columnId, FilterOperator.IsEmpty)];
        }
        else if (category.Date is { } date)
        {
            conditions = category.PeriodEnd is { } end
                // Between on dates takes whole days, inclusive of the last one.
                ? [Condition(columnId, FilterOperator.Between, Day(date), Day(end.AddDays(-1)))]
                : [Condition(columnId, FilterOperator.GreaterThanOrEqual, Instant(date)), Condition(columnId, FilterOperator.LessThanOrEqual, Instant(date))];
        }
        else if (category.Number is { } number)
        {
            conditions = [Condition(columnId, FilterOperator.Equals, number.ToString("R", CultureInfo.InvariantCulture))];
        }
        else if (Column.Type == DatasetColumnType.Bool)
        {
            conditions = [Condition(columnId, category.Key == "True" ? FilterOperator.IsTrue : FilterOperator.IsFalse)];
        }
        else
        {
            conditions = [Condition(columnId, FilterOperator.Equals, category.Key)];
        }
        return new FilterGroupDto { Join = FilterJoin.And, Children = conditions };
    }

    private static FilterConditionDto Condition(Guid columnId, FilterOperator op, params string[] values)
    {
        return new FilterConditionDto { ColumnId = columnId, Operator = op, Values = values.ToList() };
    }

    private static string Day(DateTime value) => value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    private static string Instant(DateTime value) => value.ToString("o", CultureInfo.InvariantCulture);
}
