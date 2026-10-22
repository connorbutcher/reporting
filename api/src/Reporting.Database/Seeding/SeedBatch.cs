namespace Reporting.Database;

/// <summary>
/// Work that has to wait for the first save: cells need their column's id, widget configs and
/// report filters reference dataset ids, and comments reference the report's id.
/// </summary>
internal sealed class SeedBatch
{
    private readonly List<PendingCell> _cells = new();
    private readonly List<PendingTable> _tables = new();
    private readonly List<PendingChart> _charts = new();
    private readonly List<Action> _finalizers = new();
    private readonly List<PendingComment> _comments = new();

    public void AddCell(DatasetRow row, DatasetColumn column, string raw)
    {
        _cells.Add(new PendingCell(row, column, raw));
    }

    public void AddTable(Widget widget, Dataset dataset, string title, string[] columnNames)
    {
        _tables.Add(new PendingTable(widget, dataset, title, columnNames));
    }

    public void AddChart(Widget widget, Func<string> buildJson)
    {
        _charts.Add(new PendingChart(widget, buildJson));
    }

    public void AddFinalizer(Action apply)
    {
        _finalizers.Add(apply);
    }

    public void AddComment(PendingComment comment)
    {
        _comments.Add(comment);
    }

    public void Apply(ReportingDbContext db)
    {
        foreach (var (row, column, raw) in _cells)
        {
            row.Cells.Add(CellValues.Create(column.Id, raw, column.Type));
        }

        foreach (var table in _tables)
        {
            table.Widget.ConfigJson = TableWidgetJson.Config(table.Title, table.Dataset, table.ColumnNames);
        }

        foreach (var (widget, buildJson) in _charts)
        {
            widget.ConfigJson = buildJson();
        }

        foreach (var apply in _finalizers)
        {
            apply();
        }

        AddComments(db);
    }

    private void AddComments(ReportingDbContext db)
    {
        if (_comments.Count == 0)
        {
            return;
        }

        var emails = _comments.SelectMany(c => c.MentionEmails.Append(c.AuthorEmail)).Distinct().ToList();
        var userIds = db.Users.Where(u => emails.Contains(u.Email)).AsEnumerable()
            .GroupBy(u => u.Email)
            .ToDictionary(g => g.Key, g => g.Min(u => u.Id));
        foreach (var pending in _comments)
        {
            if (userIds.TryGetValue(pending.AuthorEmail, out var authorId))
            {
                db.WidgetComments.Add(ToComment(pending, authorId, userIds));
            }
        }
    }

    private static WidgetComment ToComment(PendingComment pending, int authorId, Dictionary<string, int> userIds)
    {
        return new WidgetComment
        {
            ReportId = pending.Report.Id,
            WidgetRefId = pending.WidgetRef,
            AuthorUserId = authorId,
            Body = pending.Body,
            CreatedAt = DateTime.UtcNow.AddHours(-pending.HoursAgo),
            AnchorX = pending.AnchorX,
            AnchorY = pending.AnchorY,
            AnchorYAxisIndex = pending.AnchorX is null ? null : 0,
            Mentions = pending.MentionEmails
                .Where(userIds.ContainsKey)
                .Select(email => new WidgetCommentMention { UserId = userIds[email] })
                .ToList(),
        };
    }
}
