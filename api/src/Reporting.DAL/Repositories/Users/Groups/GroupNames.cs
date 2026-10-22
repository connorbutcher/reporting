using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

internal static class GroupNames
{
    /// <summary>The trimmed name. Throws <see cref="DataValidationException"/> when blank or taken by another group.</summary>
    public static async Task<string> RequireAvailableAsync(ReportingDbContext db, string? name, int? excludeGroupId)
    {
        var trimmed = (name ?? string.Empty).Trim();
        if (trimmed.Length == 0)
        {
            throw new DataValidationException("A group name is required.");
        }

        if (await db.UserGroups.AnyAsync(g => g.Name == trimmed && g.Id != excludeGroupId))
        {
            throw new DataValidationException($"A group called \"{trimmed}\" already exists.");
        }

        return trimmed;
    }
}
