using Microsoft.EntityFrameworkCore;

namespace Reporting.Database;

public class ReportingDbContext : DbContext
{
    public ReportingDbContext(DbContextOptions<ReportingDbContext> options) : base(options)
    {
    }

    public DbSet<Folder> Folders => Set<Folder>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<ReportRevision> ReportRevisions => Set<ReportRevision>();
    public DbSet<Widget> Widgets => Set<Widget>();
    public DbSet<Dataset> Datasets => Set<Dataset>();
    public DbSet<DatasetColumn> DatasetColumns => Set<DatasetColumn>();
    public DbSet<DatasetRow> DatasetRows => Set<DatasetRow>();
    public DbSet<DatasetCell> DatasetCells => Set<DatasetCell>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserGroup> UserGroups => Set<UserGroup>();
    public DbSet<UserGroupMember> UserGroupMembers => Set<UserGroupMember>();
    public DbSet<AccessGrant> AccessGrants => Set<AccessGrant>();
    public DbSet<GrantAuditEntry> GrantAuditEntries => Set<GrantAuditEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Every entity keeps a stable Guid RefId as its external/logical key, unique so it can be
        // looked up like the old primary key. Widget is the exception (handled below): its RefId is
        // preserved across version copies, so it repeats and is only unique within a revision.
        modelBuilder.Entity<Folder>().HasIndex(f => f.RefId).IsUnique();
        modelBuilder.Entity<Report>().HasIndex(r => r.RefId).IsUnique();
        modelBuilder.Entity<ReportRevision>().HasIndex(rv => rv.RefId).IsUnique();
        modelBuilder.Entity<Dataset>().HasIndex(d => d.RefId).IsUnique();
        modelBuilder.Entity<DatasetColumn>().HasIndex(c => c.RefId).IsUnique();
        modelBuilder.Entity<DatasetRow>().HasIndex(r => r.RefId).IsUnique();

        modelBuilder.Entity<Folder>()
            .HasOne(f => f.ParentFolder)
            .WithMany()
            .HasForeignKey(f => f.ParentFolderId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Report>()
            .HasIndex(r => r.Number)
            .IsUnique();

        modelBuilder.Entity<Report>()
            .HasOne(r => r.Folder)
            .WithMany()
            .HasForeignKey(r => r.FolderId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Report>()
            .HasMany(r => r.Revisions)
            .WithOne(rv => rv.Report)
            .HasForeignKey(rv => rv.ReportId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ReportRevision>()
            .Property(rv => rv.Columns)
            .HasDefaultValue(12);

        modelBuilder.Entity<ReportRevision>()
            .Property(rv => rv.Rows)
            .HasDefaultValue(10);

        modelBuilder.Entity<ReportRevision>()
            .Property(rv => rv.Kind)
            .HasConversion<string>();

        modelBuilder.Entity<ReportRevision>()
            .HasMany(rv => rv.Widgets)
            .WithOne(w => w.ReportRevision)
            .HasForeignKey(w => w.ReportRevisionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Widget>()
            .Property(w => w.Type)
            .HasConversion<string>();

        // A widget's RefId is stable across versions, so it repeats across revisions of a report —
        // unique only within a single revision, which is all the client's per-revision diff needs.
        modelBuilder.Entity<Widget>()
            .HasIndex(w => new { w.ReportRevisionId, w.RefId })
            .IsUnique();

        modelBuilder.Entity<Dataset>()
            .HasMany(d => d.Columns)
            .WithOne(c => c.Dataset)
            .HasForeignKey(c => c.DatasetId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Dataset>()
            .HasMany(d => d.Rows)
            .WithOne(r => r.Dataset)
            .HasForeignKey(r => r.DatasetId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DatasetColumn>()
            .Property(c => c.Type)
            .HasConversion<string>();

        modelBuilder.Entity<DatasetRow>()
            .HasMany(r => r.Cells)
            .WithOne(c => c.Row)
            .HasForeignKey(c => c.RowId)
            .OnDelete(DeleteBehavior.Cascade);

        // A row holds at most one cell per column.
        modelBuilder.Entity<DatasetCell>()
            .HasIndex(c => new { c.RowId, c.ColumnId })
            .IsUnique();

        // Filters always narrow by column first, then compare one typed value, so
        // each index leads with ColumnId. Each is filtered to the cells that carry a
        // value of that type: a cell only ever populates the column matching its own
        // type, so the vast majority of rows are NULL for any given typed column and
        // would otherwise bloat the index. The filter mirrors the IS NOT NULL that
        // every typed comparison in FilterTranslator already implies, so the optimizer
        // still uses these for those predicates. NumberValue/DateValue are also SPARSE
        // at the database level (applied by migration; EF does not model SPARSE), which
        // reclaims the fixed-width bytes those NULLs would otherwise reserve.
        modelBuilder.Entity<DatasetCell>()
            .HasIndex(c => new { c.ColumnId, c.NumberValue })
            .HasFilter("[NumberValue] IS NOT NULL");
        modelBuilder.Entity<DatasetCell>()
            .HasIndex(c => new { c.ColumnId, c.DateValue })
            .HasFilter("[DateValue] IS NOT NULL");
        modelBuilder.Entity<DatasetCell>()
            .HasIndex(c => new { c.ColumnId, c.StringValue })
            .HasFilter("[StringValue] IS NOT NULL");

        // --- identity & permissions ---------------------------------------

        // Inheritance is the default, so existing folders/reports keep flowing access down
        // from the open root baseline once the column is added.
        modelBuilder.Entity<Folder>().Property(f => f.InheritsPermissions).HasDefaultValue(true);
        modelBuilder.Entity<Report>().Property(r => r.InheritsPermissions).HasDefaultValue(true);

        modelBuilder.Entity<User>().HasIndex(u => u.RefId).IsUnique();
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<UserGroup>().HasIndex(g => g.RefId).IsUnique();

        // Membership is a plain join keyed by its two sides; deleting either end drops the row.
        modelBuilder.Entity<UserGroupMember>().HasKey(m => new { m.UserGroupId, m.UserId });
        modelBuilder.Entity<UserGroupMember>()
            .HasOne(m => m.UserGroup)
            .WithMany(g => g.Members)
            .HasForeignKey(m => m.UserGroupId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<UserGroupMember>()
            .HasOne(m => m.User)
            .WithMany(u => u.Memberships)
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Enums stored as text, matching the rest of the model. AccessLevel's ordering is
        // only ever compared in memory (during resolution), never in SQL.
        modelBuilder.Entity<AccessGrant>().Property(g => g.SecurableType).HasConversion<string>();
        modelBuilder.Entity<AccessGrant>().Property(g => g.SubjectType).HasConversion<string>();
        modelBuilder.Entity<AccessGrant>().Property(g => g.Level).HasConversion<string>();

        // At most one grant per subject per securable; and a fast lookup of everything granted
        // to a given subject. Securable/subject are polymorphic, so neither has a FK.
        // HasFilter(null) drops EF's default "IS NOT NULL" filter so SQL Server's own unique
        // index (NULLs compared equal) enforces the constraint for the null cases too — a
        // single Root/Everyone baseline, one Everyone grant per folder, and so on.
        modelBuilder.Entity<AccessGrant>()
            .HasIndex(g => new { g.SecurableType, g.SecurableId, g.SubjectType, g.SubjectId })
            .IsUnique()
            .HasFilter(null);
        modelBuilder.Entity<AccessGrant>()
            .HasIndex(g => new { g.SubjectType, g.SubjectId });

        modelBuilder.Entity<GrantAuditEntry>().Property(a => a.SecurableType).HasConversion<string>();
        modelBuilder.Entity<GrantAuditEntry>().Property(a => a.Action).HasConversion<string>();
        modelBuilder.Entity<GrantAuditEntry>().Property(a => a.SubjectType).HasConversion<string>();
        modelBuilder.Entity<GrantAuditEntry>().Property(a => a.OldLevel).HasConversion<string>();
        modelBuilder.Entity<GrantAuditEntry>().Property(a => a.NewLevel).HasConversion<string>();
        // Retrieval is always "the trail for this securable, newest first".
        modelBuilder.Entity<GrantAuditEntry>()
            .HasIndex(a => new { a.SecurableType, a.SecurableId, a.CreatedAt });
    }
}
