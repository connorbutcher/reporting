using System.Text.Encodings.Web;
using System.Text.Json;

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

    /// <summary>Text escaped for use inside a JSON string, leaving characters such as £ and — readable.</summary>
    public static string Escape(string value)
    {
        return JsonEncodedText.Encode(value, JavaScriptEncoder.UnsafeRelaxedJsonEscaping).ToString();
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
