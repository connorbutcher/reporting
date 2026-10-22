using System.Globalization;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Widgets;

/// <summary>
/// Remembers what one dimension held across the rows of one group, so drill-through can turn the
/// group back into filter conditions selecting exactly those rows. Groups are keyed by formatted
/// value, and formatting is monotonic (rounding, truncating a date), so a group's numbers and dates
/// always form an unbroken range: selecting min..max picks the group's rows and no others.
/// </summary>
public sealed class PivotDimensionTracker
{
    /// <summary>Beyond this many distinct texts a group's drill-through is given up rather than listing them all.</summary>
    private const int MaxDistinctTexts = 50;

    private bool _sawBlank;
    private bool _sawValue;
    private double? _minNumber, _maxNumber;
    private DateTime? _minDate, _maxDate;
    private bool? _bool;
    private bool _mixedBool;
    private HashSet<string>? _texts;
    private DateTime? _periodStart, _periodEnd;

    public void Add(DatasetCell? cell, PivotFieldValue value)
    {
        if (value.PeriodStart is { } start)
        {
            _sawValue = true;
            _periodStart = start;
            _periodEnd = value.PeriodEnd;
            return;
        }
        if (cell is null || string.IsNullOrEmpty(cell.StringValue))
        {
            _sawBlank = true;
            return;
        }

        _sawValue = true;
        if (cell.NumberValue is { } number)
        {
            _minNumber = _minNumber is { } lo ? Math.Min(lo, number) : number;
            _maxNumber = _maxNumber is { } hi ? Math.Max(hi, number) : number;
        }
        if (cell.DateValue is { } date)
        {
            _minDate = _minDate is { } lo && lo <= date ? lo : date;
            _maxDate = _maxDate is { } hi && hi >= date ? hi : date;
        }
        if (cell.BoolValue is { } flag)
        {
            _mixedBool |= _bool is { } seen && seen != flag;
            _bool = flag;
        }
        _texts ??= new HashSet<string>(StringComparer.Ordinal);
        if (_texts.Count <= MaxDistinctTexts)
        {
            _texts.Add(cell.StringValue);
        }
    }

    /// <summary>Conditions selecting this group's rows on <paramref name="field"/>, or null when they can't be expressed exactly.</summary>
    public List<FilterConditionDto>? Conditions(PivotField field)
    {
        var columnId = field.Column.RefId;

        if (_sawBlank)
        {
            // A group mixing blanks with values (a value that formats to nothing) can't be selected as one.
            return _sawValue ? null : [Condition(columnId, FilterOperator.IsEmpty)];
        }
        if (!_sawValue)
        {
            return null;
        }

        if (_periodStart is { } start && _periodEnd is { } end)
        {
            // Between on dates takes whole days, inclusive of the last one.
            return [Condition(columnId, FilterOperator.Between, Day(start), Day(end.AddDays(-1)))];
        }

        switch (field.Column.Type)
        {
            case DatasetColumnType.Int or DatasetColumnType.Double when _minNumber is { } lo && _maxNumber is { } hi:
                return lo == hi
                    ? [Condition(columnId, FilterOperator.Equals, Number(lo))]
                    : [Condition(columnId, FilterOperator.Between, Number(lo), Number(hi))];
            case DatasetColumnType.DateTime when _minDate is { } from && _maxDate is { } to:
                return [Condition(columnId, FilterOperator.GreaterThanOrEqual, Instant(from)), Condition(columnId, FilterOperator.LessThanOrEqual, Instant(to))];
            case DatasetColumnType.Bool when _bool is { } flag && !_mixedBool:
                return [Condition(columnId, flag ? FilterOperator.IsTrue : FilterOperator.IsFalse)];
            case DatasetColumnType.String:
                if (_texts is null || _texts.Count > MaxDistinctTexts)
                {
                    return null;
                }
                return _texts.Count == 1
                    ? [Condition(columnId, FilterOperator.Equals, _texts.First())]
                    : [Condition(columnId, FilterOperator.In, _texts.Order(StringComparer.Ordinal).ToArray())];
            default:
                return null;
        }
    }

    private static FilterConditionDto Condition(Guid columnId, FilterOperator op, params string[] values)
    {
        return new FilterConditionDto { ColumnId = columnId, Operator = op, Values = values.ToList() };
    }

    private static string Number(double value)
    {
        return value.ToString("R", CultureInfo.InvariantCulture);
    }

    private static string Day(DateTime value)
    {
        return value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }

    private static string Instant(DateTime value)
    {
        return value.ToString("o", CultureInfo.InvariantCulture);
    }
}
