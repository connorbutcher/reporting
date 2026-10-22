using Microsoft.EntityFrameworkCore;
using Reporting.Abstractions;
using Reporting.DAL.Formulas;
using Reporting.DAL.Formulas.Catalogue;
using Reporting.DAL.Identity;
using Reporting.DAL.Permissions;
using Reporting.DAL.Repositories;
using Reporting.DAL.Widgets;
using Reporting.Database;

namespace Reporting.Api;

public static class DataServices
{
    public static IServiceCollection AddReportingData(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ReportingDbContext>(options =>
        {
            options.UseSqlServer(configuration.GetConnectionString("Default"));
        });
        AddDatasets(services);
        AddReports(services);
        AddWidgetQueries(services);
        AddPermissionsAndUsers(services);
        return services;
    }

    private static void AddDatasets(IServiceCollection services)
    {
        services.AddScoped<DatasetResolver>();
        services.AddScoped<DatasetRepository>();
        services.AddScoped<DatasetRowRepository>();
        services.AddScoped<DatasetColumnUsageService>();
        services.AddScoped<FormulaFunctionCatalogueLoader>();
        services.AddScoped<FormulaCalculationService>();
        services.AddScoped<DatasetFormulaRepository>();
    }

    private static void AddReports(IServiceCollection services)
    {
        services.AddScoped<FolderRepository>();
        services.AddScoped<ReportRepository>();
        services.AddScoped<ReportPersonalizationService>();
        services.AddScoped<ReportViewStateService>();
        services.AddScoped<ReportSharedViewService>();
        services.AddScoped<WidgetCommentService>();
    }

    private static void AddWidgetQueries(IServiceCollection services)
    {
        services.AddScoped<ToleranceResolver>();
        services.AddScoped<ChartToleranceBands>();
        services.AddScoped<TableQueryService>();
        services.AddScoped<PivotQueryService>();
        services.AddScoped<ChartQueryService>();
        services.AddScoped<BarChartQueryService>();
        services.AddScoped<BoxPlotQueryService>();
        services.AddScoped<XBarRChartQueryService>();
        services.AddScoped<HistogramQueryService>();
        services.AddScoped<KpiQueryService>();
    }

    private static void AddPermissionsAndUsers(IServiceCollection services)
    {
        services.AddScoped<PermissionService>();
        services.AddScoped<ResourceAuthorizer>();
        services.AddScoped<PermissionAdminService>();
        services.AddScoped<AppPermissionService>();
        services.AddScoped<UserRepository>();
        services.AddScoped<UserAdminService>();
        services.AddScoped<UserGroupAdminService>();

        // Until authentication is wired up the app runs as the seeded default user. Real auth swaps
        // this single registration for a claims-backed accessor.
        services.AddScoped<ICurrentUserAccessor, DevCurrentUserAccessor>();
    }
}
