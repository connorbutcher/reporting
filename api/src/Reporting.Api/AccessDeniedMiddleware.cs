using Reporting.DAL.Repositories;

namespace Reporting.Api;

/// <summary>
/// Turns an <see cref="AccessDeniedException"/> thrown anywhere in a request into a 403,
/// so repositories can guard operations without every controller action catching it.
/// </summary>
public sealed class AccessDeniedMiddleware(RequestDelegate next)
{
    public async Task Invoke(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (AccessDeniedException ex) when (!context.Response.HasStarted)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "text/plain";
            await context.Response.WriteAsync(ex.Message);
        }
    }
}
