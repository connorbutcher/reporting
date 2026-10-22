using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class AccessGrantConfiguration : IEntityTypeConfiguration<AccessGrant>
{
    private const string SecurableCheck =
        "([SecurableType] = 'Folder' AND [FolderId] IS NOT NULL AND [ReportId] IS NULL) OR "
        + "([SecurableType] = 'Report' AND [ReportId] IS NOT NULL AND [FolderId] IS NULL) OR "
        + "([SecurableType] = 'Root' AND [FolderId] IS NULL AND [ReportId] IS NULL)";

    private const string SubjectCheck =
        "([SubjectType] = 'User' AND [UserId] IS NOT NULL AND [UserGroupId] IS NULL) OR "
        + "([SubjectType] = 'Group' AND [UserGroupId] IS NOT NULL AND [UserId] IS NULL) OR "
        + "([SubjectType] = 'Everyone' AND [UserId] IS NULL AND [UserGroupId] IS NULL)";

    public void Configure(EntityTypeBuilder<AccessGrant> builder)
    {
        builder.Property(g => g.SecurableType).HasConversion<string>();
        builder.Property(g => g.SubjectType).HasConversion<string>();
        builder.Property(g => g.Level).HasConversion<string>();

        builder.HasOne<Folder>().WithMany().HasForeignKey(g => g.FolderId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Report>().WithMany().HasForeignKey(g => g.ReportId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>().WithMany().HasForeignKey(g => g.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<UserGroup>().WithMany().HasForeignKey(g => g.UserGroupId).OnDelete(DeleteBehavior.Cascade);

        builder.ToTable(t => t.HasCheckConstraint("CK_AccessGrant_Securable", SecurableCheck));
        builder.ToTable(t => t.HasCheckConstraint("CK_AccessGrant_Subject", SubjectCheck));

        // HasFilter(null) drops EF's default IS NOT NULL filter, so SQL Server (which compares NULLs
        // as equal in a unique index) also enforces one grant per subject for Root and Everyone.
        builder.HasIndex(g => new { g.SecurableType, g.FolderId, g.ReportId, g.SubjectType, g.UserId, g.UserGroupId })
            .IsUnique()
            .HasFilter(null);
    }
}
