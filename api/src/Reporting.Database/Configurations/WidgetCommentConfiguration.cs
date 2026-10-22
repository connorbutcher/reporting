using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class WidgetCommentConfiguration : IEntityTypeConfiguration<WidgetComment>
{
    public void Configure(EntityTypeBuilder<WidgetComment> builder)
    {
        builder.Property(c => c.Body).HasMaxLength(WidgetComment.MaxBodyLength);

        // No FK to Widget: WidgetRefId outlives the Widget row it was made against.
        builder.HasIndex(c => new { c.ReportId, c.WidgetRefId, c.CreatedAt });
        builder.HasOne<Report>().WithMany().HasForeignKey(c => c.ReportId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>().WithMany().HasForeignKey(c => c.AuthorUserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(c => c.Mentions).WithOne().HasForeignKey(m => m.CommentId).OnDelete(DeleteBehavior.Cascade);
    }
}
