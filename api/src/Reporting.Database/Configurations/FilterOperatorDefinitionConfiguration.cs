using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class FilterOperatorDefinitionConfiguration : IEntityTypeConfiguration<FilterOperatorDefinition>
{
    public void Configure(EntityTypeBuilder<FilterOperatorDefinition> builder)
    {
        builder.Property(o => o.ColumnType).HasConversion<string>();
        builder.Property(o => o.Operator).HasConversion<string>();
        builder.Property(o => o.OperandKind).HasConversion<string>();
        builder.HasIndex(o => new { o.ColumnType, o.Operator }).IsUnique();
        builder.HasData(FilterOperatorSeedData.Rows());
    }
}
