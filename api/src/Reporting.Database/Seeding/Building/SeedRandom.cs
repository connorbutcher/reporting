namespace Reporting.Database;

internal static class SeedRandom
{
    /// <summary>A standard-normal sample via Box–Muller.</summary>
    public static double NextNormal(Random rng)
    {
        var u1 = 1.0 - rng.NextDouble();
        var u2 = 1.0 - rng.NextDouble();
        return Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
    }
}
