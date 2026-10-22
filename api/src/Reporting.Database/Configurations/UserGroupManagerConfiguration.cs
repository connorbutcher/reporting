using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class UserGroupManagerConfiguration : IEntityTypeConfiguration<UserGroupManager>
{
    public void Configure(EntityTypeBuilder<UserGroupManager> builder)
    {
        builder.HasKey(m => new { m.UserGroupId, m.UserId });

        builder.HasOne(m => m.UserGroup)
            .WithMany(g => g.Managers)
            .HasForeignKey(m => m.UserGroupId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(m => m.User)
            .WithMany()
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
