using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class DatasetCellConfiguration : IEntityTypeConfiguration<DatasetCell>
{
    public void Configure(EntityTypeBuilder<DatasetCell> builder)
    {
        builder.HasIndex(c => new { c.RowId, c.ColumnId }).IsUnique();

        // Filters narrow by column then compare one typed value. Each index is filtered to the cells
        // that carry that type, since a cell only populates one typed field. NumberValue and DateValue
        // are also SPARSE, applied by migration because EF doesn't model it.
        builder.HasIndex(c => new { c.ColumnId, c.NumberValue }).HasFilter("[NumberValue] IS NOT NULL");
        builder.HasIndex(c => new { c.ColumnId, c.DateValue }).HasFilter("[DateValue] IS NOT NULL");
        builder.HasIndex(c => new { c.ColumnId, c.StringValue }).HasFilter("[StringValue] IS NOT NULL");
    }
}
