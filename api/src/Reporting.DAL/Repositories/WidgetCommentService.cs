using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// Comments engineers leave on a widget while viewing a report — a plain note, or one pinned to a
/// point on a chart. Keyed on the widget's stable ref id, so a comment survives the widget being
/// copied into a new revision (<see cref="WidgetComment"/>). Authorized at the controller: every
/// action here only needs to know the report is one the caller can already view.
/// </summary>
public class WidgetCommentService(ReportingDbContext db, ICurrentUserAccessor currentUser)
{
    public async Task<List<WidgetCommentDto>> GetAsync(int reportId, Guid widgetRefId)
    {
        var userId = (await currentUser.GetAsync()).Id;
        var comments = await Rows(reportId, widgetRefId).Include(c => c.Mentions).OrderByDescending(c => c.CreatedAt).ToListAsync();
        if (comments.Count == 0)
        {
            return [];
        }

        var authors = await AuthorsByUserIdAsync(comments);
        return comments.Select(c => ToDto(c, authors, userId)).ToList();
    }

    /// <summary>A report's comment count per widget, for the viewer's footer pills — one request rather than one per widget.</summary>
    public async Task<Dictionary<Guid, int>> GetCountsAsync(int reportId) =>
        await db.WidgetComments
            .Where(c => c.ReportId == reportId)
            .GroupBy(c => c.WidgetRefId)
            .Select(g => new { WidgetRefId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.WidgetRefId, g => g.Count);

    /// <exception cref="DataValidationException">An empty or oversized body (a 400).</exception>
    public async Task<WidgetCommentDto> CreateAsync(int reportId, Guid widgetRefId, CreateWidgetCommentDto dto)
    {
        var body = dto.Body.Trim();
        if (body.Length == 0 || body.Length > WidgetComment.MaxBodyLength)
        {
            throw new DataValidationException("The comment must be between 1 and 4,000 characters.");
        }

        var user = await currentUser.GetAsync();
        var mentionedIds = dto.MentionedUserIds.Distinct().ToList();
        var mentionedUserIds = mentionedIds.Count == 0
            ? []
            : await db.Users.Where(u => mentionedIds.Contains(u.RefId)).Select(u => u.Id).ToListAsync();

        var comment = new WidgetComment
        {
            ReportId = reportId,
            WidgetRefId = widgetRefId,
            AuthorUserId = user.Id,
            Body = body,
            CreatedAt = DateTime.UtcNow,
            AnchorX = dto.AnchorX,
            AnchorY = dto.AnchorY,
            AnchorYAxisIndex = dto.AnchorYAxisIndex,
            Mentions = mentionedUserIds.Select(id => new WidgetCommentMention { UserId = id }).ToList(),
        };
        db.WidgetComments.Add(comment);
        await db.SaveChangesAsync();

        var authors = await AuthorsByUserIdAsync([comment]);
        authors[user.Id] = new WidgetCommentAuthorDto { Id = user.RefId, DisplayName = user.DisplayName };
        return ToDto(comment, authors, user.Id);
    }

    /// <summary>Deletes the caller's own comment. Does nothing if it isn't theirs or doesn't exist — unguarded, like un-starring.</summary>
    public async Task DeleteAsync(int reportId, Guid widgetRefId, int commentId)
    {
        var userId = (await currentUser.GetAsync()).Id;
        await Rows(reportId, widgetRefId)
            .Where(c => c.Id == commentId && c.AuthorUserId == userId)
            .ExecuteDeleteAsync();
    }

    private IQueryable<WidgetComment> Rows(int reportId, Guid widgetRefId) =>
        db.WidgetComments.Where(c => c.ReportId == reportId && c.WidgetRefId == widgetRefId);

    /// <summary>Every author and mentioned user the given comments reference, by user id — no navigation property joins them, so this is a separate lookup.</summary>
    private async Task<Dictionary<int, WidgetCommentAuthorDto>> AuthorsByUserIdAsync(List<WidgetComment> comments)
    {
        var userIds = comments.Select(c => c.AuthorUserId)
            .Concat(comments.SelectMany(c => c.Mentions.Select(m => m.UserId)))
            .Distinct();
        return await db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => new WidgetCommentAuthorDto { Id = u.RefId, DisplayName = u.DisplayName });
    }

    private static WidgetCommentDto ToDto(WidgetComment c, Dictionary<int, WidgetCommentAuthorDto> authors, int currentUserId) =>
        new()
        {
            Id = c.Id,
            Author = authors.GetValueOrDefault(c.AuthorUserId) ?? new WidgetCommentAuthorDto(),
            Body = c.Body,
            CreatedAt = c.CreatedAt,
            AnchorX = c.AnchorX,
            AnchorY = c.AnchorY,
            AnchorYAxisIndex = c.AnchorYAxisIndex,
            IsOwn = c.AuthorUserId == currentUserId,
            Mentions = c.Mentions
                .Select(m => authors.GetValueOrDefault(m.UserId) ?? new WidgetCommentAuthorDto())
                .ToList(),
        };
}
