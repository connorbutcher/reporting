using Microsoft.AspNetCore.Mvc;
using Reporting.Abstractions;
using Reporting.DAL.Repositories;

namespace Reporting.Api.Controllers;

/// <summary>Users and groups, for the permission editor's subject pickers.</summary>
[ApiController]
[Route("api/[controller]")]
public class UsersController(UserRepository users) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> GetUsers() => await users.GetUsersAsync();

    [HttpGet("~/api/user-groups")]
    public async Task<ActionResult<List<UserGroupDto>>> GetGroups() => await users.GetGroupsAsync();
}
