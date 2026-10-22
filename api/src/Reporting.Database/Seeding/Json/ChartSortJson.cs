using System.Globalization;

namespace Reporting.Database;

internal static class ChartSortJson
{
    public static string Default()
    {
        return """{"by":"default","columnId":null,"aggregate":"sum","descending":false,"limit":null,"showOther":false}""";
    }

    /// <summary>Ranks categories by <paramref name="columnRef"/>; <paramref name="limit"/> keeps only the first N.</summary>
    public static string ByColumn(Guid columnRef, string aggregate, bool descending, int? limit = null, bool showOther = false)
    {
        var limitJson = limit is { } n ? n.ToString(CultureInfo.InvariantCulture) : "null";
        return $$"""{"by":"column","columnId":"{{columnRef}}","aggregate":"{{aggregate}}","descending":{{SeedJson.Bool(descending)}},"limit":{{limitJson}},"showOther":{{SeedJson.Bool(showOther)}}}""";
    }
}
