using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Returnly.Api.DTOs;
using Returnly.Api.Interfaces;
using Returnly.Api.Services;

namespace Returnly.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/redemption-requests")]
public sealed class RedemptionRequestsController(
    ICustomerPortalService customerPortalService,
    ICurrentTenant currentTenant) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResponse<AdminRedemptionRequestDto>>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<AdminRedemptionRequestDto>>>> GetAll(
        [FromQuery] RedemptionRequestQueryParameters query,
        CancellationToken cancellationToken)
    {
        var restaurantId = currentTenant.RestaurantId
            ?? throw new UnauthorizedAccessException("The token does not contain a restaurant_id claim.");
        var requests = await customerPortalService.GetAdminRedemptionsAsync(
            restaurantId, query, cancellationToken);
        return Ok(new ApiResponse<PagedResponse<AdminRedemptionRequestDto>>(requests));
    }

    [HttpPost("confirm")]
    [ProducesResponseType<ApiResponse<ConfirmedRedemptionDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status410Gone)]
    public async Task<ActionResult<ApiResponse<ConfirmedRedemptionDto>>> Confirm(
        [FromBody] ConfirmRedemptionRequest request,
        CancellationToken cancellationToken)
    {
        var restaurantId = currentTenant.RestaurantId
            ?? throw new UnauthorizedAccessException("The token does not contain a restaurant_id claim.");
        var userValue = User.FindFirstValue("user_id");
        if (!Guid.TryParse(userValue, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var confirmed = await customerPortalService.ConfirmAsync(
                restaurantId, userId, request, cancellationToken);
            return Ok(new ApiResponse<ConfirmedRedemptionDto>(
                confirmed,
                "Reward redemption confirmed."));
        }
        catch (RedemptionConfirmationNotFoundException)
        {
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Redemption request not found",
                detail: "The code was not found for the authenticated restaurant.");
        }
        catch (RedemptionAlreadyProcessedException)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Code already used",
                detail: "This one-time redemption code has already been processed.");
        }
        catch (CustomerPortalInsufficientPointsException)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Not enough points",
                detail: "The customer no longer has enough points for this reward.");
        }
        catch (RedemptionRequestExpiredException)
        {
            return Problem(
                statusCode: StatusCodes.Status410Gone,
                title: "Code expired",
                detail: "This redemption code has expired. Ask the customer to request another.");
        }
    }
}
