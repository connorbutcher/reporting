using System.Text.Json;
using System.Text.Json.Serialization;
using Reporting.Abstractions;
using Xunit;

namespace Reporting.Tests;

public class DatasetColumnConfigTests
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowOutOfOrderMetadataProperties = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    [Fact]
    public void Reads_legacy_blob_without_kind_into_concrete_type()
    {
        // Existing stored configs (and seed data) carry no "kind" discriminator.
        var config = JsonSerializer.Deserialize(
            "{\"decimals\":2,\"suffix\":\":1\"}", typeof(NumericColumnConfig), Options);

        var numeric = Assert.IsType<NumericColumnConfig>(config);
        Assert.Equal(2, numeric.Decimals);
        Assert.Equal(":1", numeric.Suffix);
    }

    [Fact]
    public void Reads_blob_that_includes_kind()
    {
        var config = JsonSerializer.Deserialize(
            "{\"kind\":\"numeric\",\"decimals\":1,\"suffix\":\" kW\"}", typeof(NumericColumnConfig), Options);

        var numeric = Assert.IsType<NumericColumnConfig>(config);
        Assert.Equal(1, numeric.Decimals);
        Assert.Equal(" kW", numeric.Suffix);
    }

    [Fact]
    public void Serializes_with_kind_discriminator_through_base()
    {
        var json = JsonSerializer.Serialize(
            new DateColumnConfig { DateFormat = "d MMM yyyy" }, typeof(DatasetColumnConfig), Options);

        // The polymorphic "kind" discriminator is emitted so the blob is self-describing.
        Assert.Contains("\"kind\":\"date\"", json);
        Assert.Contains("d MMM yyyy", json);
    }

    [Fact]
    public void Round_trips_polymorphically_through_base()
    {
        var json = JsonSerializer.Serialize(
            new BoolColumnConfig { TrueLabel = "Pass", FalseLabel = "Fail" }, typeof(DatasetColumnConfig), Options);

        var config = JsonSerializer.Deserialize<DatasetColumnConfig>(json, Options);

        var flag = Assert.IsType<BoolColumnConfig>(config);
        Assert.Equal("Pass", flag.TrueLabel);
        Assert.Equal("Fail", flag.FalseLabel);
    }

    [Theory]
    [InlineData(DatasetColumnType.Int, DatasetColumnConfigKind.Numeric)]
    [InlineData(DatasetColumnType.Double, DatasetColumnConfigKind.Numeric)]
    [InlineData(DatasetColumnType.DateTime, DatasetColumnConfigKind.Date)]
    [InlineData(DatasetColumnType.Bool, DatasetColumnConfigKind.Bool)]
    [InlineData(DatasetColumnType.String, DatasetColumnConfigKind.Text)]
    public void Maps_each_column_type_to_its_config_kind(DatasetColumnType type, DatasetColumnConfigKind expected)
    {
        Assert.Equal(expected, DatasetColumnConfig.KindFor(type));
    }
}
