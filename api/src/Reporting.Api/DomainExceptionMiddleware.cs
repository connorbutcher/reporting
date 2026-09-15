using Reporting.DAL.Filtering;
using Reporting.DAL.Formulas;
using Reporting.DAL.Repositories;

namespace Reporting.Api;

/// <summary>
/// Turns a domain exception thrown anywhere in a request into the HTTP status it stands for — the
/// status each exception type declares on its own class (validation/filter ⇒ 400, conflict ⇒ 409,
/// nested-not-found ⇒ 404, access-denied ⇒ 403). This is the single place that mapping is applied, so
/// controllers and repositories can signal a failure by throwing (or letting one propagate) instead of
/// every action wrapping each call in try/catch. Anything unrecognised propagates to the framework's
/// default 500 handling.
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

    private static int? StatusFor(Exception exception) => exception switch
    {
        DataValidationException or FilterException or FormulaParseException or FormulaValidationException
            => StatusCodes.Status400BadRequest,
        DataConflictException => StatusCodes.Status409Conflict,
        DataNotFoundException => StatusCodes.Status404NotFound,
        AccessDeniedException => StatusCodes.Status403Forbidden,
        _ => null
    };
}
