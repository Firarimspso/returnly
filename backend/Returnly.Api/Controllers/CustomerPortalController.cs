using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Returnly.Api.DTOs;
using Returnly.Api.Interfaces;
using Returnly.Api.Services;

namespace Returnly.Api.Controllers;

[Authorize(AuthenticationSchemes = CustomerPortalTokenService.AuthenticationScheme)]
[ApiController]
[Route("api/public/customer-portal")]
public sealed class CustomerPortalController(ICustomerPortalService customerPortalService)
    : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<ApiResponse<CustomerPortalDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<CustomerPortalDto>>> Get(
        CancellationToken cancellationToken)
    {
        try
        {
            var portal = await customerPortalService.GetAsync(cancellationToken);
            return Ok(new ApiResponse<CustomerPortalDto>(portal));
        }
        catch (CustomerPortalNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("redemptions")]
    [ProducesResponseType<ApiResponse<RedemptionRequestDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApiResponse<RedemptionRequestDto>>> RequestRedemption(
        [FromBody] CreateRedemptionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var redemption = await customerPortalService.RequestRedemptionAsync(
                request, cancellationToken);
            return StatusCode(
                StatusCodes.Status201Created,
                new ApiResponse<RedemptionRequestDto>(
                    redemption,
                    "Show this one-time code to restaurant staff to confirm your reward."));
        }
        catch (CustomerPortalRewardNotFoundException)
        {
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Reward unavailable",
                detail: "This reward is not available for the restaurant.");
        }
        catch (CustomerPortalInsufficientPointsException)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Not enough points",
                detail: "The customer does not have enough points for this reward.");
        }
    }
}
