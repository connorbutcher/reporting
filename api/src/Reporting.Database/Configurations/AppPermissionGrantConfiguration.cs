using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class AppPermissionGrantConfiguration : IEntityTypeConfiguration<AppPermissionGrant>
{
    public void Configure(EntityTypeBuilder<AppPermissionGrant> builder)
    {
        builder.Property(g => g.Permission).HasConversion<string>();
        builder.HasOne<User>().WithMany().HasForeignKey(g => g.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(g => new { g.Permission, g.UserId }).IsUnique();
    }
}
