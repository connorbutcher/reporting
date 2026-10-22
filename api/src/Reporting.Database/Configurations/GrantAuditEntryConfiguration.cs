using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class GrantAuditEntryConfiguration : IEntityTypeConfiguration<GrantAuditEntry>
{
    public void Configure(EntityTypeBuilder<GrantAuditEntry> builder)
    {
        builder.Property(a => a.SecurableType).HasConversion<string>();
        builder.Property(a => a.Action).HasConversion<string>();
        builder.Property(a => a.SubjectType).HasConversion<string>();
        builder.Property(a => a.OldLevel).HasConversion<string>();
        builder.Property(a => a.NewLevel).HasConversion<string>();
        builder.HasIndex(a => new { a.SecurableType, a.SecurableId, a.CreatedAt });
    }
}
