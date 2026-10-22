using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class ReportRevisionConfiguration : IEntityTypeConfiguration<ReportRevision>
{
    public void Configure(EntityTypeBuilder<ReportRevision> builder)
    {
        builder.HasIndex(rv => rv.RefId).IsUnique();

        builder.Property(rv => rv.Kind).HasConversion<string>();

        builder.HasMany(rv => rv.Tabs)
            .WithOne(t => t.ReportRevision)
            .HasForeignKey(t => t.ReportRevisionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(rv => rv.Datasets)
            .WithOne(d => d.ReportRevision)
            .HasForeignKey(d => d.ReportRevisionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
