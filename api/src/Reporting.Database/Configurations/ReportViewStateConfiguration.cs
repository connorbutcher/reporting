using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class ReportViewStateConfiguration : IEntityTypeConfiguration<ReportViewState>
{
    public void Configure(EntityTypeBuilder<ReportViewState> builder)
    {
        builder.HasIndex(s => new { s.UserId, s.ReportId }).IsUnique();
        builder.HasOne<User>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Report>().WithMany().HasForeignKey(s => s.ReportId).OnDelete(DeleteBehavior.Cascade);
    }
}
