using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Returnly.Api.DTOs;
using Returnly.Api.Interfaces;
using Returnly.Api.Services;

namespace Returnly.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/restaurant-profile")]
public sealed class RestaurantProfileController(
    IRestaurantProfileService service,
    ICurrentTenant currentTenant) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<ApiResponse<RestaurantProfileDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<RestaurantProfileDto>>> Get(
        CancellationToken cancellationToken)
    {
        var profile = await service.GetAsync(RestaurantId(), cancellationToken);
        return profile is null
            ? NotFound()
            : Ok(new ApiResponse<RestaurantProfileDto>(profile));
    }

    [HttpPut]
    [ProducesResponseType<ApiResponse<RestaurantProfileDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<RestaurantProfileDto>>> Update(
        [FromBody] UpdateRestaurantProfileRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var profile = await service.UpdateAsync(RestaurantId(), request, cancellationToken);
            return profile is null
                ? NotFound()
                : Ok(new ApiResponse<RestaurantProfileDto>(profile, "Restaurant profile updated."));
        }
        catch (InvalidRestaurantProfileException exception)
        {
            return Problem(statusCode: 400, title: "Invalid restaurant profile", detail: exception.Message);
        }
    }

    private Guid RestaurantId() => currentTenant.RestaurantId
        ?? throw new UnauthorizedAccessException("The token does not contain a restaurant_id claim.");
}
