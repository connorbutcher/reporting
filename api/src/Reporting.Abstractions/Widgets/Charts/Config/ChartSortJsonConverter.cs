using System.Text.Json;
using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>
/// Reads a <see cref="ChartSort"/> in its normal object shape, but also tolerates the legacy
/// box-plot-only <c>BoxSort</c> enum string ("category"/"medianAsc"/"medianDesc"/"spreadDesc") a
/// report saved before box plot's sort generalized to this shared type — read as the chart's
/// default (natural) order, since the old value named no column to re-derive a ranking from.
/// Without this, an older report's stored config JSON fails to deserialize and the whole report
/// becomes unreadable.
/// </summary>
public class ChartSortJsonConverter : JsonConverter<ChartSort>
{
    /// <summary>The real shape, deserialized into a shadow type so this converter isn't invoked recursively.</summary>
    private sealed class Shape
    {
        public ChartSortBy By { get; set; } = ChartSortBy.Default;
        public Guid? ColumnId { get; set; }
        public SortAggregate Aggregate { get; set; } = SortAggregate.Sum;
        public bool Descending { get; set; }
    }

    public override ChartSort? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            reader.Skip();
            return new ChartSort();
        }

        var shape = JsonSerializer.Deserialize<Shape>(ref reader, options);
        return shape is null
            ? null
            : new ChartSort
            {
                By = shape.By,
                ColumnId = shape.ColumnId,
                Aggregate = shape.Aggregate,
                Descending = shape.Descending
            };
    }

    public override void Write(Utf8JsonWriter writer, ChartSort value, JsonSerializerOptions options) =>
        JsonSerializer.Serialize(writer, new Shape
        {
            By = value.By,
            ColumnId = value.ColumnId,
            Aggregate = value.Aggregate,
            Descending = value.Descending
        }, options);
}
