using System.Text.Json;
using System.Text.Json.Serialization;

namespace Reporting.Api;

public static class ApiServices
{
    public static IServiceCollection AddReportingApi(this IServiceCollection services)
    {
        services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));

                // Widget configs are polymorphic. Without this the "type" discriminator would have to be the
                // first property, a trap for any client that builds the object by spreading defaults.
                options.JsonSerializerOptions.AllowOutOfOrderMetadataProperties = true;
            });
        services.AddOpenApi();

        // No credentials, since AllowAnyOrigin and AllowCredentials can't be combined.
        services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
            });
        });
        return services;
    }
}
