using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class WidgetCommentMentionConfiguration : IEntityTypeConfiguration<WidgetCommentMention>
{
    public void Configure(EntityTypeBuilder<WidgetCommentMention> builder)
    {
        builder.HasIndex(m => new { m.CommentId, m.UserId }).IsUnique();

        // Restrict: SQL Server refuses a second cascade path to Users via the comment's author.
        builder.HasOne<User>().WithMany().HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Restrict);
    }
}
