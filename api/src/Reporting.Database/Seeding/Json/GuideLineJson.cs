using System.Globalization;

namespace Reporting.Database;

/// <summary>Fixed-value guide lines and shaded ranges drawn on a chart axis.</summary>
internal static class GuideLineJson
{
    public static string List(params string[] lines)
    {
        return "[" + string.Join(",", lines) + "]";
    }

    /// <summary>A single line; <paramref name="direction"/> says which side counts as out of range.</summary>
    public static string Line(string axis, double value, string label, string color, string direction = "above", bool outlinePoints = false)
    {
        return $$"""{"id":"{{Guid.NewGuid()}}","axis":"{{axis}}","yAxisId":null,"value":{{Number(value)}},"valueTo":null,"label":"{{label}}","color":"{{color}}","dashStyle":"dashed","fill":false,"outlinePoints":{{SeedJson.Bool(outlinePoints)}},"direction":"{{direction}}"}""";
    }

    public static string Range(string axis, double from, double to, string label, string color)
    {
        return $$"""{"id":"{{Guid.NewGuid()}}","axis":"{{axis}}","yAxisId":null,"value":{{Number(from)}},"valueTo":{{Number(to)}},"label":"{{label}}","color":"{{color}}","dashStyle":"dotted","fill":true,"outlinePoints":false,"direction":null}""";
    }

    private static string Number(double value)
    {
        return value.ToString(CultureInfo.InvariantCulture);
    }
}
