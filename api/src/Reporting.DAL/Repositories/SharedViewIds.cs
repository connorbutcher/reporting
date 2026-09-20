using System.Security.Cryptography;
using System.Text;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>Short ids for shared filter snapshots, and the hash that finds an existing one.</summary>
internal static class SharedViewIds
{
    // Lowercase only, so an id means the same under a case-insensitive database collation.
    private const string Alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";

    public static string New() =>
        string.Create(ReportSharedView.ShortIdLength, 0, static (span, _) =>
        {
            for (var i = 0; i < span.Length; i++) span[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        });

    public static string HashOf(string filters) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(filters)));
}
