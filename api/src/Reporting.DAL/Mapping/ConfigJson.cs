using System.Text.Json;
using System.Text.Json.Serialization;
using Reporting.Abstractions;

namespace Reporting.DAL;

internal static class ConfigJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        // The stored blob is written by us, but stay tolerant of discriminator order.
        AllowOutOfOrderMetadataProperties = true,
        Converters =
        {
            new JsonStringEnumConverter(JsonNamingPolicy.CamelCase),
            // A box plot saved before its sort generalized from the BoxSort enum to ChartSort
            // stored a bare string here; without this, that old config fails to deserialize.
            new ChartSortJsonConverter()
        }
    };
}
