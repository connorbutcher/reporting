using Reporting.Api;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddReportingApi();
builder.Services.AddReportingData(builder.Configuration);

var app = builder.Build();
DatabaseStartup.MigrateAndSeed(app.Services);

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseMiddleware<DomainExceptionMiddleware>();
app.UseAuthorization();
app.MapControllers();
app.Run();
