using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

/// <summary>
/// Scoped in the service: a global admin manages every group, a delegated manager only theirs.
/// Independent of the manage-users permission.
/// </summary>
[ApiController]
[Route("api/admin/user-groups")]
public class AdminGroupsController(UserGroupAdminService groups) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AdminGroupDto>>> GetAll()
    {
        return await groups.ListAsync();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AdminGroupDetailDto>> Get(Guid id)
    {
        var group = await groups.GetAsync(id);
        return group is null ? NotFound() : group;
    }

    [HttpGet("name-available")]
    public async Task<ActionResult<GroupNameAvailableDto>> NameAvailable(
        [FromQuery] string name, [FromQuery] Guid? excludeId)
    {
        return new GroupNameAvailableDto { Available = await groups.NameAvailableAsync(name, excludeId) };
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
    public async Task<IActionResult> Delete(Guid id)
    {
        return await groups.DeleteAsync(id) ? NoContent() : NotFound();
    }
}
