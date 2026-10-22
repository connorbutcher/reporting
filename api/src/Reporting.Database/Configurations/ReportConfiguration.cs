using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class ReportConfiguration : IEntityTypeConfiguration<Report>
{
    public void Configure(EntityTypeBuilder<Report> builder)
    {
        builder.HasIndex(r => r.RefId).IsUnique();
        builder.HasIndex(r => r.Number).IsUnique();

        builder.HasOne(r => r.Folder)
            .WithMany()
            .HasForeignKey(r => r.FolderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(r => r.Revisions)
            .WithOne(rv => rv.Report)
            .HasForeignKey(rv => rv.ReportId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(r => r.InheritsPermissions).HasDefaultValue(true);
    }
}
