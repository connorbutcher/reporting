using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

/// <summary>
/// Admin-area group management: list, view, create, edit, and delete. Every action is scoped in the
/// service by whether the caller manages groups — a global admin manages all (and creates them), a
/// delegated group manager only the ones they manage. Independent of the manage-users permission.
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
    public async Task<ActionResult<AdminGroupDetailDto>> Create(SaveGroupDto dto)
    {
        var group = await groups.CreateAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = group.Id }, group);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AdminGroupDetailDto>> Update(Guid id, SaveGroupDto dto)
    {
        var group = await groups.UpdateAsync(id, dto);
        return group is null ? NotFound() : group;
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) =>
        await groups.DeleteAsync(id) ? NoContent() : NotFound();
}
