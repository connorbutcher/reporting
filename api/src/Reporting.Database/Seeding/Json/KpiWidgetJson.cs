using System.Globalization;

namespace Reporting.Database;

internal static class KpiWidgetJson
{
    /// <summary><paramref name="toleranceJson"/> is "null" for the aggregate value source, else a <see cref="Tolerance"/> object.</summary>
    public static string Config(
        string title, Dataset dataset, string valueSource, string aggregate, Guid? valueColumnRef,
        string toleranceJson, string toleranceStatusMode, bool showAsPercent,
        string comparisonMode, double? targetValue, Guid? dateColumnRef, int periodDays,
        string direction, string unitPrefix, string unitSuffix, int decimalPlaces,
        bool thresholdsEnabled = false, double? warningThreshold = null, double? criticalThreshold = null,
        bool showSparkline = false, int sparklinePeriods = 8,
        bool showAsMeter = false,
        Guid? groupByColumnRef = null, int maxGroups = 8)
    {
        return $$"""
            {"type":"kpi","title":"{{title}}","showTitle":true,
             "datasetId":{{dataset.Id}},
             "valueSource":"{{valueSource}}","aggregate":"{{aggregate}}","valueColumnId":{{SeedJson.Guid(valueColumnRef)}},
             "tolerance":{{toleranceJson}},"toleranceStatusMode":"{{toleranceStatusMode}}","showAsPercent":{{SeedJson.Bool(showAsPercent)}},
             "comparisonMode":"{{comparisonMode}}","targetValue":{{Number(targetValue)}},"dateColumnId":{{SeedJson.Guid(dateColumnRef)}},"periodDays":{{periodDays}},
             "direction":"{{direction}}","unitPrefix":"{{unitPrefix}}","unitSuffix":"{{unitSuffix}}","decimalPlaces":{{decimalPlaces}},
             "thresholdsEnabled":{{SeedJson.Bool(thresholdsEnabled)}},"warningThreshold":{{Number(warningThreshold)}},"criticalThreshold":{{Number(criticalThreshold)}},
             "showSparkline":{{SeedJson.Bool(showSparkline)}},"sparklinePeriods":{{sparklinePeriods}},"showAsMeter":{{SeedJson.Bool(showAsMeter)}},
             "groupByColumnId":{{SeedJson.Guid(groupByColumnRef)}},"maxGroups":{{maxGroups}},
             "filter":null}
            """;
    }

    public static string Tolerance(int specDatasetId, Guid rowRef, Guid minRef, Guid maxRef)
    {
        return $$"""{"sourceDatasetId":{{specDatasetId}},"sourceRowId":"{{rowRef}}","minColumnId":"{{minRef}}","maxColumnId":"{{maxRef}}"}""";
    }

    private static string Number(double? value)
    {
        return value is { } v ? v.ToString(CultureInfo.InvariantCulture) : "null";
    }
}
