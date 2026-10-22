using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

internal static partial class UserFields
{
    public static string RequireDisplayName(string? displayName)
    {
        var trimmed = (displayName ?? string.Empty).Trim();
        if (trimmed.Length == 0)
        {
            throw new DataValidationException("A display name is required.");
        }

        return trimmed;
    }

    /// <summary>The trimmed email. Throws when it's malformed or already used.</summary>
    public static async Task<string> RequireNewEmailAsync(ReportingDbContext db, string? email)
    {
        var trimmed = (email ?? string.Empty).Trim();
        if (trimmed.Length == 0 || !EmailPattern().IsMatch(trimmed))
        {
            throw new DataValidationException("A valid email is required.");
        }

        if (await db.Users.AnyAsync(u => u.Email == trimmed))
        {
            throw new DataValidationException($"A user with the email \"{trimmed}\" already exists.");
        }

        return trimmed;
    }

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex EmailPattern();
}
