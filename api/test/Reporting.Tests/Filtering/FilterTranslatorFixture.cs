using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>A four-column schema and row/filter builders for the in-memory filter translator tests.</summary>
public static class FilterTranslatorFixture
{
    public static readonly Guid NameRef = Guid.NewGuid();
    public static readonly Guid QtyRef = Guid.NewGuid();
    public static readonly Guid WhenRef = Guid.NewGuid();
    public static readonly Guid OkRef = Guid.NewGuid();

    public static IReadOnlyDictionary<Guid, DatasetColumn> Columns()
    {
        return new Dictionary<Guid, DatasetColumn>
        {
            [NameRef] = new() { Id = 1, RefId = NameRef, Name = "Name", Type = DatasetColumnType.String },
            [QtyRef] = new() { Id = 2, RefId = QtyRef, Name = "Qty", Type = DatasetColumnType.Int },
            [WhenRef] = new() { Id = 3, RefId = WhenRef, Name = "When", Type = DatasetColumnType.DateTime },
            [OkRef] = new() { Id = 4, RefId = OkRef, Name = "Ok", Type = DatasetColumnType.Bool },
        };
    }

    public static DatasetRow Row(string? name = null, double? qty = null, DateTime? when = null, bool? ok = null)
    {
        var row = new DatasetRow();
        if (name is not null)
        {
            row.Cells.Add(new DatasetCell { ColumnId = 1, StringValue = name });
        }

        if (qty is not null)
        {
            row.Cells.Add(new DatasetCell { ColumnId = 2, NumberValue = qty });
        }

        if (when is not null)
        {
            row.Cells.Add(new DatasetCell { ColumnId = 3, DateValue = when });
        }

        if (ok is not null)
        {
            row.Cells.Add(new DatasetCell { ColumnId = 4, BoolValue = ok });
        }

        return row;
    }

    public static FilterConditionDto Cond(Guid column, FilterOperator op, params string[] values)
    {
        return new() { ColumnId = column, Operator = op, Values = [.. values] };
    }

    public static FilterGroupDto And(params FilterNodeDto[] children)
    {
        return new() { Join = FilterJoin.And, Children = [.. children] };
    }
    public static FilterGroupDto Or(params FilterNodeDto[] children)
    {
        return new() { Join = FilterJoin.Or, Children = [.. children] };
    }

    public static Func<DatasetRow, bool> Compile(FilterNodeDto node)
    {
        return FilterTranslator.Build(node, Columns())!.Compile();
    }

    public static bool Matches(FilterNodeDto node, DatasetRow row)
    {
        return Compile(node)(row);
    }
}
