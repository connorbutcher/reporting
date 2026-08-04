using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Reporting.Api.Contracts;
using Reporting.Api.Data;
using Reporting.Api.Domain;

namespace Reporting.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly ReportingDbContext _db;

    public ReportsController(ReportingDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<ReportSummaryDto>>> GetAll()
    {
        var reports = await _db.Reports.Include(r => r.Revisions).ToListAsync();
        return reports.Select(r => r.ToSummaryDto()).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ReportSummaryDto>> GetById(Guid id)
    {
        var report = await _db.Reports.Include(r => r.Revisions).FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return NotFound();
        return report.ToSummaryDto();
    }

    [HttpPost]
    public async Task<ActionResult<ReportSummaryDto>> Create(CreateReportDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A report needs a name.");

        if (dto.FolderId is { } folderId && !await _db.Folders.AnyAsync(f => f.Id == folderId))
        {
            return BadRequest("Folder does not exist.");
        }

        var nextNumber = (await _db.Reports.MaxAsync(r => (int?)r.Number) ?? 0) + 1;
        var report = new Report
        {
            Id = Guid.NewGuid(),
            Number = nextNumber,
            Name = dto.Name.Trim(),
            FolderId = dto.FolderId,
            CreatedAt = DateTime.UtcNow,
        };
        report.Revisions.Add(new ReportRevision
        {
            Id = Guid.NewGuid(),
            ReportId = report.Id,
            Kind = RevisionKind.Draft,
            CreatedAt = DateTime.UtcNow,
        });

        _db.Reports.Add(report);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), report.ToSummaryDto());
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ReportSummaryDto>> Update(Guid id, SaveReportDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("A report needs a name.");

        var report = await _db.Reports.Include(r => r.Revisions).FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return NotFound();

        if (dto.FolderId is { } folderId && !await _db.Folders.AnyAsync(f => f.Id == folderId))
        {
            return BadRequest("Folder does not exist.");
        }

        report.Name = dto.Name.Trim();
        report.FolderId = dto.FolderId;
        await _db.SaveChangesAsync();
        return report.ToSummaryDto();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var report = await _db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return NotFound();

        _db.Reports.Remove(report);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // --- version history --------------------------------------------------

    [HttpGet("{id:guid}/versions")]
    public async Task<ActionResult<List<ReportVersionSummaryDto>>> GetVersions(Guid id)
    {
        if (!await _db.Reports.AnyAsync(r => r.Id == id)) return NotFound();

        var versions = await _db.ReportRevisions
            .Where(rv => rv.ReportId == id && rv.Kind == RevisionKind.Published)
            .OrderByDescending(rv => rv.VersionNumber)
            .ToListAsync();

        return versions.Select(v => v.ToVersionSummaryDto()).ToList();
    }

    [HttpGet("{id:guid}/versions/{versionNumber:int}")]
    public async Task<ActionResult<ReportRevisionDto>> GetVersion(Guid id, int versionNumber)
    {
        var report = await _db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return NotFound();

        var revision = await _db.ReportRevisions
            .Include(rv => rv.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == id && rv.Kind == RevisionKind.Published && rv.VersionNumber == versionNumber);
        if (revision is null) return NotFound();

        return revision.ToContentDto(report);
    }

    // --- draft (checkout / autosave / publish) -----------------------------

    [HttpGet("{id:guid}/draft")]
    public async Task<ActionResult<ReportRevisionDto>> GetDraft(Guid id)
    {
        var report = await _db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return NotFound();

        var draft = await _db.ReportRevisions
            .Include(rv => rv.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == id && rv.Kind == RevisionKind.Draft);
        if (draft is null) return NotFound();

        return draft.ToContentDto(report);
    }

    /// <summary>Checks out a draft to edit. Idempotent: an existing draft is returned as-is.</summary>
    [HttpPost("{id:guid}/draft")]
    public async Task<ActionResult<ReportRevisionDto>> Checkout(Guid id, CheckoutDraftDto dto)
    {
        var report = await _db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return NotFound();

        var existingDraft = await _db.ReportRevisions
            .Include(rv => rv.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == id && rv.Kind == RevisionKind.Draft);
        if (existingDraft is not null) return existingDraft.ToContentDto(report);

        ReportRevision? source = dto.FromVersionNumber is { } versionNumber
            ? await _db.ReportRevisions
                .Include(rv => rv.Widgets)
                .FirstOrDefaultAsync(rv => rv.ReportId == id && rv.Kind == RevisionKind.Published && rv.VersionNumber == versionNumber)
            : await _db.ReportRevisions
                .Include(rv => rv.Widgets)
                .Where(rv => rv.ReportId == id && rv.Kind == RevisionKind.Published)
                .OrderByDescending(rv => rv.VersionNumber)
                .FirstOrDefaultAsync();

        if (dto.FromVersionNumber is not null && source is null) return NotFound("Version not found.");

        var draft = new ReportRevision
        {
            Id = Guid.NewGuid(),
            ReportId = id,
            Kind = RevisionKind.Draft,
            Columns = source?.Columns ?? 12,
            Rows = source?.Rows ?? 10,
            CreatedAt = DateTime.UtcNow,
        };

        if (source is not null)
        {
            foreach (var widget in source.Widgets)
            {
                draft.Widgets.Add(new Widget
                {
                    Id = Guid.NewGuid(),
                    ReportRevisionId = draft.Id,
                    Type = widget.Type,
                    X = widget.X,
                    Y = widget.Y,
                    W = widget.W,
                    H = widget.H,
                    ConfigJson = widget.ConfigJson,
                });
            }
        }

        _db.ReportRevisions.Add(draft);
        await _db.SaveChangesAsync();
        return draft.ToContentDto(report);
    }

    [HttpPut("{id:guid}/draft")]
    public async Task<ActionResult<ReportRevisionDto>> UpdateDraft(Guid id, ReportRevisionDto dto)
    {
        var report = await _db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return NotFound();

        var draft = await _db.ReportRevisions
            .Include(rv => rv.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == id && rv.Kind == RevisionKind.Draft);
        if (draft is null) return NotFound("No draft is checked out.");

        draft.Columns = Math.Max(1, dto.Columns);
        draft.Rows = Math.Max(1, dto.Rows);

        var incomingIds = dto.Widgets.Select(w => w.Id).ToHashSet();
        draft.Widgets.RemoveAll(w => !incomingIds.Contains(w.Id));

        foreach (var widgetDto in dto.Widgets)
        {
            var widget = draft.Widgets.FirstOrDefault(w => w.Id == widgetDto.Id);
            if (widget is null)
            {
                widget = new Widget { ReportRevisionId = draft.Id };
                widgetDto.ApplyTo(widget);
                draft.Widgets.Add(widget);

                // Widget ids are generated by the client, so change detection would
                // otherwise read this as an existing row and emit an UPDATE that
                // matches nothing. Mark it as an insert explicitly.
                _db.Entry(widget).State = EntityState.Added;
            }
            else
            {
                widgetDto.ApplyTo(widget);
            }
        }

        await _db.SaveChangesAsync();
        return draft.ToContentDto(report);
    }

    [HttpPost("{id:guid}/draft/publish")]
    public async Task<ActionResult<ReportVersionSummaryDto>> Publish(Guid id, PublishDraftDto dto)
    {
        var report = await _db.Reports.FirstOrDefaultAsync(r => r.Id == id);
        if (report is null) return NotFound();

        var draft = await _db.ReportRevisions
            .Include(rv => rv.Widgets)
            .FirstOrDefaultAsync(rv => rv.ReportId == id && rv.Kind == RevisionKind.Draft);
        if (draft is null) return NotFound("No draft is checked out.");

        var nextVersion = (await _db.ReportRevisions
            .Where(rv => rv.ReportId == id && rv.Kind == RevisionKind.Published)
            .MaxAsync(rv => (int?)rv.VersionNumber) ?? 0) + 1;

        var published = new ReportRevision
        {
            Id = Guid.NewGuid(),
            ReportId = id,
            Kind = RevisionKind.Published,
            VersionNumber = nextVersion,
            Columns = draft.Columns,
            Rows = draft.Rows,
            CreatedAt = DateTime.UtcNow,
            PublishedAt = DateTime.UtcNow,
            Notes = dto.Notes,
        };
        foreach (var widget in draft.Widgets)
        {
            published.Widgets.Add(new Widget
            {
                Id = Guid.NewGuid(),
                ReportRevisionId = published.Id,
                Type = widget.Type,
                X = widget.X,
                Y = widget.Y,
                W = widget.W,
                H = widget.H,
                ConfigJson = widget.ConfigJson,
            });
        }

        _db.ReportRevisions.Add(published);
        _db.ReportRevisions.Remove(draft);
        await _db.SaveChangesAsync();
        return published.ToVersionSummaryDto();
    }

    [HttpDelete("{id:guid}/draft")]
    public async Task<IActionResult> DiscardDraft(Guid id)
    {
        var draft = await _db.ReportRevisions
            .FirstOrDefaultAsync(rv => rv.ReportId == id && rv.Kind == RevisionKind.Draft);
        if (draft is null) return NotFound();

        _db.ReportRevisions.Remove(draft);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
