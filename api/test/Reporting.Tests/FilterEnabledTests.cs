using System.Text.Json;
using System.Text.Json.Serialization;
using Reporting.Abstractions;
using Reporting.DAL.Filtering;
using Reporting.Database;
using Xunit;

namespace Reporting.Tests;

public class FilterEnabledTests
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowOutOfOrderMetadataProperties = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private static readonly Guid ColumnRef = Guid.NewGuid();

    private static IReadOnlyDictionary<Guid, DatasetColumn> Columns() => new Dictionary<Guid, DatasetColumn>
    {
        [ColumnRef] = new DatasetColumn { Id = 1, RefId = ColumnRef, Name = "Name", Type = DatasetColumnType.String }
    };

    private static DatasetRow Row(string value) =>
        new() { Cells = { new DatasetCell { ColumnId = 1, StringValue = value } } };

    private static FilterConditionDto Equals(string value, bool enabled = true) => new()
    {
        ColumnId = ColumnRef,
        Operator = FilterOperator.Equals,
        Values = [value],
        Enabled = enabled
    };

    [Fact]
    public void Enabled_defaults_to_true_when_json_omits_it()
    {
        var condition = JsonSerializer.Deserialize<FilterConditionDto>(
            "{\"kind\":\"condition\",\"columnId\":\"" + ColumnRef + "\",\"operator\":\"equals\",\"values\":[\"a\"]}",
            Options);

        Assert.NotNull(condition);
        Assert.True(condition!.Enabled);
    }

    [Fact]
    public void Reads_enabled_false_from_json()
    {
        var condition = JsonSerializer.Deserialize<FilterConditionDto>(
            "{\"kind\":\"condition\",\"columnId\":\"" + ColumnRef + "\",\"operator\":\"equals\",\"values\":[\"a\"],\"enabled\":false}",
            Options);

        Assert.NotNull(condition);
        Assert.False(condition!.Enabled);
    }

    [Fact]
    public void Group_of_only_disabled_conditions_narrows_nothing()
    {
        var group = new FilterGroupDto { Children = { Equals("Alice", enabled: false) } };

        var predicate = FilterTranslator.Build(group, Columns());

        // No enabled condition to translate — the filter is a no-op.
        Assert.Null(predicate);
    }

    [Fact]
    public void Disabled_condition_is_skipped_leaving_the_enabled_ones()
    {
        var group = new FilterGroupDto
        {
            Join = FilterJoin.And,
            Children =
            {
                Equals("Alice", enabled: true),
                Equals("Bob", enabled: false) // AND "Bob" would match nothing if applied.
            }
        };

        var predicate = FilterTranslator.Build(group, Columns())!.Compile();

        Assert.True(predicate(Row("Alice")));  // the enabled condition still applies
        Assert.False(predicate(Row("Bob")));   // the disabled one doesn't rescue a non-match
        Assert.False(predicate(Row("Carol")));
    }
}
