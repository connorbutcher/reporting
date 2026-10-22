using System.Text.Json;
using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>
/// Also reads the legacy box-plot <c>BoxSort</c> enum string as the default order, so reports saved
/// before <see cref="ChartSort"/> existed still deserialize.
/// </summary>
public class ChartSortJsonConverter : JsonConverter<ChartSort>
{
    public override ChartSort? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            reader.Skip();
            return new ChartSort();
        }

        var shape = JsonSerializer.Deserialize<ChartSortShape>(ref reader, options);
        if (shape is null)
        {
            return null;
        }

        return new ChartSort
        {
            By = shape.By,
            ColumnId = shape.ColumnId,
            Aggregate = shape.Aggregate,
            Descending = shape.Descending
        };
    }

    public override void Write(Utf8JsonWriter writer, ChartSort value, JsonSerializerOptions options)
    {
        var shape = new ChartSortShape
        {
            By = value.By,
            ColumnId = value.ColumnId,
            Aggregate = value.Aggregate,
            Descending = value.Descending
        };
        JsonSerializer.Serialize(writer, shape, options);
    }
}
