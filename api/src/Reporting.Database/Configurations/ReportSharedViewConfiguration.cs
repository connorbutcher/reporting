using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class ReportSharedViewConfiguration : IEntityTypeConfiguration<ReportSharedView>
{
    public void Configure(EntityTypeBuilder<ReportSharedView> builder)
    {
        builder.Property(v => v.ShortId).HasMaxLength(ReportSharedView.ShortIdLength);
        builder.Property(v => v.FiltersHash).HasMaxLength(64);
        builder.HasIndex(v => v.ShortId).IsUnique();
        builder.HasIndex(v => new { v.ReportId, v.FiltersHash }).IsUnique();
        builder.HasOne<Report>().WithMany().HasForeignKey(v => v.ReportId).OnDelete(DeleteBehavior.Cascade);

        // Removing the creator leaves the link working.
        builder.HasOne<User>().WithMany().HasForeignKey(v => v.CreatedByUserId).OnDelete(DeleteBehavior.SetNull);
    }
}
