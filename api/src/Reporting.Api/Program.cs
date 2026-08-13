using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
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

builder.Services.AddDbContext<ReportingDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddScoped<DatasetRepository>();
builder.Services.AddScoped<DatasetRowRepository>();
builder.Services.AddScoped<FolderRepository>();
builder.Services.AddScoped<ReportRepository>();
builder.Services.AddScoped<ToleranceResolver>();
builder.Services.AddScoped<WidgetQueryRepository>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ReportingDbContext>();
    db.Database.Migrate();
    DbSeeder.Seed(db);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
