namespace Reporting.Database;

internal static class SeedJson
{
    public static string Bool(bool value)
    {
        return value ? "true" : "false";
    }

    public static string String(string? value)
    {
        return value is null ? "null" : $"\"{value}\"";
    }

    public static string Guid(Guid? value)
    {
        return value is { } v ? $"\"{v}\"" : "null";
    }

    public static string GuidArray(IEnumerable<Guid> values)
    {
        return string.Join(",", values.Select(v => $"\"{v}\""));
    }
}
