using System.Text.Json;
using System.Text.Json.Serialization;
using Reporting.Abstractions;

namespace Reporting.Tests;

public class ChartSortJsonConverterTests
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase), new ChartSortJsonConverter() }
    };

    [Fact]
    public void Round_trips_a_top_n_sort_with_other()
    {
        var sort = new ChartSort
        {
            By = ChartSortBy.Column,
            ColumnId = Guid.NewGuid(),
            Aggregate = SortAggregate.Average,
            Descending = true,
            Limit = 10,
            ShowOther = true
        };

        var json = JsonSerializer.Serialize(sort, Options);
        var read = JsonSerializer.Deserialize<ChartSort>(json, Options)!;

        Assert.Equal(sort.By, read.By);
        Assert.Equal(sort.ColumnId, read.ColumnId);
        Assert.Equal(sort.Aggregate, read.Aggregate);
        Assert.True(read.Descending);
        Assert.Equal(10, read.Limit);
        Assert.True(read.ShowOther);
    }

    [Fact]
    public void Reads_the_legacy_box_sort_string_as_the_default_order()
    {
        var read = JsonSerializer.Deserialize<ChartSort>("\"median\"", Options)!;

        Assert.Equal(ChartSortBy.Default, read.By);
        Assert.Null(read.Limit);
    }
}
