using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Permissions;

/// <summary>
/// Reads and edits the grants on folders and reports. The controller has already required Manager on the
/// target, and Manager is the highest grantable level, so nothing here can escalate anyone.
/// </summary>
public class PermissionAdminService
{
    private readonly ReportingDbContext db;
    private readonly PermissionChain chains;
    private readonly GrantAuditLog audit;
    private readonly GrantEditor editor;

    public PermissionAdminService(ReportingDbContext db, ICurrentUserAccessor currentUserAccessor)
    {
        this.db = db;
        chains = new PermissionChain(db);
        audit = new GrantAuditLog(db, currentUserAccessor);
        editor = new GrantEditor(db, currentUserAccessor, chains, audit);
    }

    public async Task<PermissionsDto?> GetFolderPermissionsAsync(int folderId)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == folderId);
        if (folder is null)
        {
            return null;
        }

        return await BuildPermissionsAsync(await chains.ForFolderAsync(folder.Id), folder.InheritsPermissions);
    }

    public async Task<PermissionsDto?> GetReportPermissionsAsync(int reportId)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == reportId);
        if (report is null)
        {
            return null;
        }

        return await BuildPermissionsAsync(await chains.ForReportAsync(report), report.InheritsPermissions);
    }

    public async Task<List<GrantAuditEntryDto>?> GetFolderAuditAsync(int folderId)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == folderId);
        if (folder is null)
        {
            return null;
        }

        return await audit.ReadAsync(SecurableType.Folder, folder.Id);
    }

    public async Task<List<GrantAuditEntryDto>?> GetReportAuditAsync(int reportId)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == reportId);
        if (report is null)
        {
            return null;
        }

        return await audit.ReadAsync(SecurableType.Report, report.Id);
    }

    public async Task<bool> SetFolderInheritanceAsync(int folderId, SetInheritanceDto dto)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == folderId);
        if (folder is null)
        {
            return false;
        }

        if (folder.InheritsPermissions != dto.Inherits)
        {
            if (!dto.Inherits && dto.CopyDown)
            {
                await editor.CopyEffectiveDownAsync(await chains.ForFolderAsync(folder.Id));
            }

            folder.InheritsPermissions = dto.Inherits;
            folder.UpdatedAt = DateTime.UtcNow;
            await audit.AddInheritanceChangeAsync(SecurableType.Folder, folder.Id, dto.Inherits);
            await db.SaveChangesAsync();
        }
        return true;
    }

    public async Task<bool> SetReportInheritanceAsync(int reportId, SetInheritanceDto dto)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == reportId);
        if (report is null)
        {
            return false;
        }

        if (report.InheritsPermissions != dto.Inherits)
        {
            if (!dto.Inherits && dto.CopyDown)
            {
                await editor.CopyEffectiveDownAsync(await chains.ForReportAsync(report));
            }

            report.InheritsPermissions = dto.Inherits;
            report.UpdatedAt = DateTime.UtcNow;
            await audit.AddInheritanceChangeAsync(SecurableType.Report, report.Id, dto.Inherits);
            await db.SaveChangesAsync();
        }
        return true;
    }

    public async Task<AccessGrantDto?> UpsertFolderGrantAsync(int folderId, SaveGrantDto dto)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == folderId);
        if (folder is null)
        {
            return null;
        }

        return await editor.UpsertAsync(await chains.ForFolderAsync(folder.Id), dto);
    }

    public async Task<AccessGrantDto?> UpsertReportGrantAsync(int reportId, SaveGrantDto dto)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == reportId);
        if (report is null)
        {
            return null;
        }

        return await editor.UpsertAsync(await chains.ForReportAsync(report), dto);
    }

    public async Task<bool> RemoveFolderGrantAsync(int folderId, RemoveGrantDto dto)
    {
        var folder = await db.Folders.FirstOrDefaultAsync(f => f.Id == folderId);
        if (folder is null)
        {
            return false;
        }

        await editor.RemoveAsync(await chains.ForFolderAsync(folder.Id), dto.SubjectType, dto.SubjectId);
        return true;
    }

    public async Task<bool> RemoveReportGrantAsync(int reportId, RemoveGrantDto dto)
    {
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == reportId);
        if (report is null)
        {
            return false;
        }

        await editor.RemoveAsync(await chains.ForReportAsync(report), dto.SubjectType, dto.SubjectId);
        return true;
    }

    private async Task<PermissionsDto> BuildPermissionsAsync(List<ChainNode> chain, bool inheritsPermissions)
    {
        var grants = await chains.LoadGrantsAsync(chain);
        var subjects = await SubjectDirectory.LoadAsync(db);
        return PermissionsView.Build(chain, grants, subjects, inheritsPermissions);
    }
}
