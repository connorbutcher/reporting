using Reporting.DAL.Filtering;
using Reporting.DAL.Repositories;

namespace Reporting.Api;

/// <summary>
/// Maps a domain exception thrown anywhere in a request to its HTTP status, so actions carry only their
/// happy path. Anything unrecognised falls through to the default 500 handling.
/// </summary>
public sealed class DomainExceptionMiddleware(RequestDelegate next)
{
    public async Task Invoke(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex) when (StatusFor(ex) is { } status && !context.Response.HasStarted)
        {
            context.Response.StatusCode = status;
            context.Response.ContentType = "text/plain";
            await context.Response.WriteAsync(ex.Message);
        }
    }

    private static int? StatusFor(Exception exception)
    {
        return exception switch
        {
            DataValidationException or FilterException => StatusCodes.Status400BadRequest,
            DataConflictException => StatusCodes.Status409Conflict,
            DataNotFoundException => StatusCodes.Status404NotFound,
            AccessDeniedException => StatusCodes.Status403Forbidden,
            _ => null
        };
    }
}
