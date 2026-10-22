using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class WidgetConfiguration : IEntityTypeConfiguration<Widget>
{
    public void Configure(EntityTypeBuilder<Widget> builder)
    {
        builder.Property(w => w.Type).HasConversion<string>();

        // RefId is kept across versions, so it's only unique within a tab.
        builder.HasIndex(w => new { w.TabId, w.RefId }).IsUnique();
    }
}
