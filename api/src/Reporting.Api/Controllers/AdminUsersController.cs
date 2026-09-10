using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.Api.Authorization;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

/// <summary>Admin-area user management: list, view, create, and edit. The whole controller requires the manage-users permission (403 otherwise).</summary>
[ApiController]
[Route("api/admin/users")]
[RequireAppPermission(AppPermission.ManageUsers)]
public class AdminUsersController(UserAdminService users) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AdminUserDto>>> GetAll() => await users.ListAsync();

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AdminUserDetailDto>> Get(Guid id)
    {
        var user = await users.GetAsync(id);
        return user is null ? NotFound() : user;
    }

    [HttpPost]
    public async Task<ActionResult<AdminUserDetailDto>> Create(SaveUserDto dto)
    {
        try
        {
            var user = await users.CreateAsync(dto);
            return CreatedAtAction(nameof(Get), new { id = user.Id }, user);
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AdminUserDetailDto>> Update(Guid id, SaveUserDto dto)
    {
        try
        {
            var user = await users.UpdateAsync(id, dto);
            return user is null ? NotFound() : user;
        }
        catch (DataValidationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
