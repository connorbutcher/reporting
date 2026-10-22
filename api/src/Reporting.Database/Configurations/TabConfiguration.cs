using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class TabConfiguration : IEntityTypeConfiguration<Tab>
{
    public void Configure(EntityTypeBuilder<Tab> builder)
    {
        // RefId is kept across versions, so it's only unique within a revision.
        builder.HasIndex(t => new { t.ReportRevisionId, t.RefId }).IsUnique();

        builder.Property(t => t.Columns).HasDefaultValue(48);
        builder.Property(t => t.Rows).HasDefaultValue(30);

        builder.HasMany(t => t.Widgets)
            .WithOne(w => w.Tab)
            .HasForeignKey(w => w.TabId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
