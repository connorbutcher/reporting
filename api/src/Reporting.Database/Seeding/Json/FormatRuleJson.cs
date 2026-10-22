namespace Reporting.Database;

/// <summary>Conditional-format rules for table columns and pivot measures; the first match wins.</summary>
internal static class FormatRuleJson
{
    public static string List(params string[] rules)
    {
        return "[" + string.Join(",", rules) + "]";
    }

    public static string Rule(string op, string value, string style, string? value2 = null)
    {
        return $$"""{"operator":"{{op}}","value":"{{value}}","value2":{{SeedJson.String(value2)}},"style":"{{style}}"}""";
    }
}
