using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Returnly.Api.DTOs;
using Returnly.Api.Interfaces;
using Returnly.Api.Services;

namespace Returnly.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/rewards")]
public sealed class RewardsController(IRewardService rewardService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResponse<RewardDto>>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<RewardDto>>>> GetAll(
        [FromQuery] RewardQueryParameters query,
        CancellationToken cancellationToken)
    {
        var rewards = await rewardService.GetPagedAsync(query, cancellationToken);
        return Ok(new ApiResponse<PagedResponse<RewardDto>>(rewards));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<RewardDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<RewardDto>>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var reward = await rewardService.GetByIdAsync(id, cancellationToken);
        return reward is null
            ? NotFound()
            : Ok(new ApiResponse<RewardDto>(reward));
    }

    [HttpPost]
    [ProducesResponseType<ApiResponse<RewardDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApiResponse<RewardDto>>> Create(
        [FromBody] CreateRewardRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var reward = await rewardService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(
                nameof(GetById),
                new { id = reward.Id },
                new ApiResponse<RewardDto>(reward, "Reward created."));
        }
        catch (RewardNameConflictException exception)
        {
            return ConflictProblem(exception.Message);
        }
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<ApiResponse<RewardDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApiResponse<RewardDto>>> Update(
        Guid id,
        [FromBody] UpdateRewardRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var reward = await rewardService.UpdateAsync(id, request, cancellationToken);
            return reward is null
                ? NotFound()
                : Ok(new ApiResponse<RewardDto>(reward, "Reward updated."));
        }
        catch (RewardNameConflictException exception)
        {
            return ConflictProblem(exception.Message);
        }
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        return await rewardService.DeleteAsync(id, cancellationToken)
            ? NoContent()
            : NotFound();
    }

    private ObjectResult ConflictProblem(string detail) =>
        Problem(
            statusCode: StatusCodes.Status409Conflict,
            title: "Reward already exists",
            detail: detail);
}
