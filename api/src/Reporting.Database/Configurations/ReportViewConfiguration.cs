using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class ReportViewConfiguration : IEntityTypeConfiguration<ReportView>
{
    public void Configure(EntityTypeBuilder<ReportView> builder)
    {
        builder.HasIndex(v => new { v.UserId, v.ReportId }).IsUnique();
        builder.HasIndex(v => new { v.UserId, v.ViewedAt });
        builder.HasOne<User>().WithMany().HasForeignKey(v => v.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Report>().WithMany().HasForeignKey(v => v.ReportId).OnDelete(DeleteBehavior.Cascade);
    }
}
