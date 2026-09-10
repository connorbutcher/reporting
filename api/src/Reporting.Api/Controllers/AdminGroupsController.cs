using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

/// <summary>
/// Admin-area group management: list, view, create, edit, and delete. Creating a group is full-admin
/// only (<c>[RequireAppPermission(ManageUsers)]</c>); the rest are scoped in the service so a delegated
/// group manager can reach the groups they manage without holding the manage-users permission.
/// </summary>
[ApiController]
[Route("api/admin/user-groups")]
public class AdminGroupsController(UserGroupAdminService groups) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AdminGroupDto>>> GetAll() => await groups.ListAsync();

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AdminGroupDetailDto>> Get(Guid id)
    {
        var group = await groups.GetAsync(id);
        return group is null ? NotFound() : group;
    }

    [HttpPost]
    [RequireAppPermission(AppPermission.ManageUsers)]
    public async Task<ActionResult<AdminGroupDetailDto>> Create(SaveGroupDto dto)
    {
        try
        {
            var group = await groups.CreateAsync(dto);
            return CreatedAtAction(nameof(Get), new { id = group.Id }, group);
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AdminGroupDetailDto>> Update(Guid id, SaveGroupDto dto)
    {
        try
        {
            var group = await groups.UpdateAsync(id, dto);
            return group is null ? NotFound() : group;
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) =>
        await groups.DeleteAsync(id) ? NoContent() : NotFound();
}
