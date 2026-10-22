using Reporting.Abstractions;

namespace Reporting.Database;

/// <summary>
/// The stand-in default user (a global admin until auth lands), the root grant open to everyone, and a
/// few demo users and a group for the permission pickers. Idempotent, so it runs on every startup.
/// </summary>
internal static class IdentitySeeder
{
    private static readonly (string Email, string Name)[] DemoUsers =
    [
        ("alice@local", "Alice Whitfield"),
        ("bob@local", "Bob Okafor"),
        ("carol@local", "Carol Lindqvist"),
    ];

    public static void Seed(ReportingDbContext db)
    {
        var changed = AddDefaultUser(db);
        changed |= AddRootBaseline(db);
        if (changed)
        {
            db.SaveChanges();
        }

        AddDemoUsers(db);
        AddDemoGroup(db);
    }

    private static bool AddDefaultUser(ReportingDbContext db)
    {
        if (db.Users.Any(u => u.RefId == WellKnownIds.DefaultUser))
        {
            return false;
        }

        var user = new User
        {
            RefId = WellKnownIds.DefaultUser,
            Email = "dev@local",
            DisplayName = "Local Developer",
            CreatedAt = DateTime.UtcNow
        };
        db.Users.Add(user);
        // The grant below needs the user's id.
        db.SaveChanges();

        db.AppPermissionGrants.Add(new AppPermissionGrant
        {
            Permission = AppPermission.GlobalAdmin,
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = 0
        });
        return true;
    }

    private static bool AddRootBaseline(ReportingDbContext db)
    {
        var exists = db.AccessGrants.Any(g =>
            g.SecurableType == SecurableType.Root && g.SubjectType == GrantSubjectType.Everyone);
        if (exists)
        {
            return false;
        }

        db.AccessGrants.Add(new AccessGrant
        {
            SecurableType = SecurableType.Root,
            SubjectType = GrantSubjectType.Everyone,
            Level = AccessLevel.Viewer,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = 0
        });
        return true;
    }

    private static void AddDemoUsers(ReportingDbContext db)
    {
        var added = false;
        foreach (var (email, name) in DemoUsers)
        {
            if (db.Users.Any(u => u.Email == email))
            {
                continue;
            }

            db.Users.Add(new User { RefId = Guid.NewGuid(), Email = email, DisplayName = name, CreatedAt = DateTime.UtcNow });
            added = true;
        }

        if (added)
        {
            db.SaveChanges();
        }
    }

    private static void AddDemoGroup(ReportingDbContext db)
    {
        if (db.UserGroups.Any(g => g.Name == "QA Leads"))
        {
            return;
        }

        var alice = db.Users.FirstOrDefault(u => u.Email == "alice@local");
        var group = new UserGroup { RefId = Guid.NewGuid(), Name = "QA Leads" };
        if (alice is not null)
        {
            group.Members.Add(new UserGroupMember { User = alice });
        }

        db.UserGroups.Add(group);
        db.SaveChanges();
    }
}
