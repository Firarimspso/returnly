using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Returnly.Api.DTOs;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/dashboard")]
public sealed class DashboardController(
    IDashboardAnalyticsService dashboardAnalyticsService) : ControllerBase
{
    [HttpGet("analytics")]
    [ProducesResponseType<ApiResponse<DashboardAnalyticsDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<DashboardAnalyticsDto>>> GetAnalytics(
        CancellationToken cancellationToken)
    {
        var analytics = await dashboardAnalyticsService.GetAsync(cancellationToken);
        return Ok(new ApiResponse<DashboardAnalyticsDto>(analytics));
    }
}
