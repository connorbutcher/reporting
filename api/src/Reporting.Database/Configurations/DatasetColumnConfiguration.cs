using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class DatasetColumnConfiguration : IEntityTypeConfiguration<DatasetColumn>
{
    public void Configure(EntityTypeBuilder<DatasetColumn> builder)
    {
        // RefId is kept across versions, so it's only unique within a dataset.
        builder.HasIndex(c => new { c.DatasetId, c.RefId }).IsUnique();

        builder.Property(c => c.Type).HasConversion<string>();
    }
}
