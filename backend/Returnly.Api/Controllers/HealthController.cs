using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Returnly.Api.DTOs;

namespace Returnly.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class HealthController(IHostEnvironment environment) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    [ProducesResponseType<ApiResponse<HealthResponse>>(StatusCodes.Status200OK)]
    public ActionResult<ApiResponse<HealthResponse>> Get()
    {
        var health = new HealthResponse("Healthy", environment.EnvironmentName, DateTimeOffset.UtcNow);
        return Ok(new ApiResponse<HealthResponse>(health));
    }
}
