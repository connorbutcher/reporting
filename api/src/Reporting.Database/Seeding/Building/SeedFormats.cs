using System.Globalization;

namespace Reporting.Database;

internal static class SeedFormats
{
    public const string Gbp = "{\"decimals\":0,\"prefix\":\"£\"}";

    public const string ShortDate = "{\"dateFormat\":\"d MMM yyyy\"}";

    public static string Pounds(int decimals)
    {
        return $"{{\"decimals\":{decimals},\"prefix\":\"£\"}}";
    }

    public static string Mm(int decimals)
    {
        return $"{{\"decimals\":{decimals},\"suffix\":\" mm\"}}";
    }

    public static string Unit(int decimals, string suffix)
    {
        return $"{{\"decimals\":{decimals},\"suffix\":\"{suffix}\"}}";
    }

    public static string Labels(string trueLabel, string falseLabel)
    {
        return $"{{\"trueLabel\":\"{trueLabel}\",\"falseLabel\":\"{falseLabel}\"}}";
    }

    public static string Num(double value)
    {
        return value.ToString("R", CultureInfo.InvariantCulture);
    }

    public static string Int(int value)
    {
        return value.ToString(CultureInfo.InvariantCulture);
    }

    public static string Bool(bool value)
    {
        return value.ToString(CultureInfo.InvariantCulture);
    }

    public static string Iso(DateTime value)
    {
        return value.ToString("O", CultureInfo.InvariantCulture);
    }

    /// <summary>A whole date as a formula column stores it.</summary>
    public static string Day(DateTime value)
    {
        return value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    }
}
