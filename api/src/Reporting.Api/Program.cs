using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Reporting.Api;
using Reporting.Abstractions;
using Reporting.DAL.Identity;
using Reporting.DAL.Permissions;
using Reporting.DAL.Repositories;
using Reporting.DAL.Widgets;
using Reporting.Database;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));

        // Widget configs are polymorphic. Without this the "type" discriminator
        // would have to be the first property in the payload, which is a trap
        // for any client that builds the object by spreading defaults.
        options.JsonSerializerOptions.AllowOutOfOrderMetadataProperties = true;
    });
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Fully open CORS: any origin, header, and method. No credentials, since
// AllowAnyOrigin and AllowCredentials can't be combined.
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddDbContext<ReportingDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddScoped<DatasetRepository>();
builder.Services.AddScoped<DatasetRowRepository>();
builder.Services.AddScoped<FolderRepository>();
builder.Services.AddScoped<ReportRepository>();
builder.Services.AddScoped<ToleranceResolver>();
builder.Services.AddScoped<WidgetQueryRepository>();
builder.Services.AddScoped<PermissionService>();
builder.Services.AddScoped<PermissionAdminService>();
builder.Services.AddScoped<UserRepository>();

// Until authentication is wired up the app runs as the seeded default user. Real auth
// swaps this single registration for a claims-backed accessor.
builder.Services.AddScoped<ICurrentUserAccessor, DevCurrentUserAccessor>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ReportingDbContext>();
    db.Database.Migrate();
    DbSeeder.Seed(db);
    DbSeeder.SeedIdentity(db);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors();

// Maps AccessDeniedException (thrown by the permission guards in the repositories) to 403.
app.UseMiddleware<AccessDeniedMiddleware>();

app.UseAuthorization();

app.MapControllers();

app.Run();
