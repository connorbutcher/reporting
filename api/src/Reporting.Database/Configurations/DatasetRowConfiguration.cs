using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class DatasetRowConfiguration : IEntityTypeConfiguration<DatasetRow>
{
    public void Configure(EntityTypeBuilder<DatasetRow> builder)
    {
        // RefId is kept across versions, so it's only unique within a dataset.
        builder.HasIndex(r => new { r.DatasetId, r.RefId }).IsUnique();

        builder.HasMany(r => r.Cells)
            .WithOne(c => c.Row)
            .HasForeignKey(c => c.RowId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
