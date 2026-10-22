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
    public DbSet<Tab> Tabs => Set<Tab>();
    public DbSet<Widget> Widgets => Set<Widget>();
    public DbSet<Dataset> Datasets => Set<Dataset>();
    public DbSet<DatasetSource> DatasetSources => Set<DatasetSource>();
    public DbSet<DatasetColumn> DatasetColumns => Set<DatasetColumn>();
    public DbSet<DatasetRow> DatasetRows => Set<DatasetRow>();
    public DbSet<DatasetCell> DatasetCells => Set<DatasetCell>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserGroup> UserGroups => Set<UserGroup>();
    public DbSet<UserGroupMember> UserGroupMembers => Set<UserGroupMember>();
    public DbSet<UserGroupManager> UserGroupManagers => Set<UserGroupManager>();
    public DbSet<AccessGrant> AccessGrants => Set<AccessGrant>();
    public DbSet<AppPermissionGrant> AppPermissionGrants => Set<AppPermissionGrant>();
    public DbSet<GrantAuditEntry> GrantAuditEntries => Set<GrantAuditEntry>();
    public DbSet<ReportFavorite> ReportFavorites => Set<ReportFavorite>();
    public DbSet<ReportView> ReportViews => Set<ReportView>();
    public DbSet<ReportViewState> ReportViewStates => Set<ReportViewState>();
    public DbSet<ReportSharedView> ReportSharedViews => Set<ReportSharedView>();
    public DbSet<WidgetComment> WidgetComments => Set<WidgetComment>();
    public DbSet<WidgetCommentMention> WidgetCommentMentions => Set<WidgetCommentMention>();
    public DbSet<FilterOperatorDefinition> FilterOperatorDefinitions => Set<FilterOperatorDefinition>();
    public DbSet<FormulaFunctionDefinition> FormulaFunctionDefinitions => Set<FormulaFunctionDefinition>();
    public DbSet<FormulaFunctionParameter> FormulaFunctionParameters => Set<FormulaFunctionParameter>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ReportingDbContext).Assembly);
    }
}
