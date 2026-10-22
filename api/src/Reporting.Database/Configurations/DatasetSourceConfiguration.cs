using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Reporting.Abstractions;

namespace Reporting.Database;

public class DatasetSourceConfiguration : IEntityTypeConfiguration<DatasetSource>
{
    public void Configure(EntityTypeBuilder<DatasetSource> builder)
    {
        builder.Property(s => s.Id).ValueGeneratedNever();
        builder.Property(s => s.Key).HasConversion<string>();
        builder.HasIndex(s => s.Key).IsUnique();
        builder.HasData(
            new DatasetSource { Id = DatasetSourceIds.Assembly, Key = DatasetSourceKey.Assembly, Name = "Assembly" },
            new DatasetSource { Id = DatasetSourceIds.Disassembly, Key = DatasetSourceKey.Disassembly, Name = "Disassembly" },
            new DatasetSource { Id = DatasetSourceIds.Specification, Key = DatasetSourceKey.Specification, Name = "Specification" },
            new DatasetSource { Id = DatasetSourceIds.Filtered, Key = DatasetSourceKey.Filtered, Name = "Filtered" });
    }
}
