using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class ReportFavoriteConfiguration : IEntityTypeConfiguration<ReportFavorite>
{
    public void Configure(EntityTypeBuilder<ReportFavorite> builder)
    {
        builder.HasIndex(f => new { f.UserId, f.ReportId }).IsUnique();
        builder.HasOne<User>().WithMany().HasForeignKey(f => f.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Report>().WithMany().HasForeignKey(f => f.ReportId).OnDelete(DeleteBehavior.Cascade);
    }
}
