using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class DatasetConfiguration : IEntityTypeConfiguration<Dataset>
{
    public void Configure(EntityTypeBuilder<Dataset> builder)
    {
        builder.HasOne(d => d.Source)
            .WithMany()
            .HasForeignKey(d => d.DatasetSourceId)
            .OnDelete(DeleteBehavior.Restrict);

        // The DAL reads "{}" as the source's default config.
        builder.Property(d => d.SourceConfigJson).HasDefaultValue("{}");

        builder.HasMany(d => d.Columns)
            .WithOne(c => c.Dataset)
            .HasForeignKey(c => c.DatasetId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(d => d.Rows)
            .WithOne(r => r.Dataset)
            .HasForeignKey(r => r.DatasetId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
