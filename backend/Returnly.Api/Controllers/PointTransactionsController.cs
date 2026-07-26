using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;
using Returnly.Api.Services;

namespace Returnly.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/point-transactions")]
public sealed class PointTransactionsController(
    IPointTransactionService pointTransactionService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResponse<PointTransactionDto>>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<PointTransactionDto>>>> GetAll(
        [FromQuery] PointTransactionQueryParameters query,
        CancellationToken cancellationToken)
    {
        var transactions = await pointTransactionService.GetPagedAsync(query, cancellationToken);
        return Ok(new ApiResponse<PagedResponse<PointTransactionDto>>(transactions));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<PointTransactionDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<PointTransactionDto>>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var transaction = await pointTransactionService.GetByIdAsync(id, cancellationToken);
        return transaction is null
            ? NotFound()
            : Ok(new ApiResponse<PointTransactionDto>(transaction));
    }

    [HttpPost("earn")]
    [ProducesResponseType<ApiResponse<PointTransactionDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public Task<ActionResult<ApiResponse<PointTransactionDto>>> Earn(
        [FromBody] CreatePointTransactionRequest request,
        CancellationToken cancellationToken) =>
        Create(request, PointTransactionType.Earn, cancellationToken);

    [HttpPost("redeem")]
    [ProducesResponseType<ApiResponse<PointTransactionDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public Task<ActionResult<ApiResponse<PointTransactionDto>>> Redeem(
        [FromBody] CreatePointTransactionRequest request,
        CancellationToken cancellationToken) =>
        Create(request, PointTransactionType.Redeem, cancellationToken);

    private async Task<ActionResult<ApiResponse<PointTransactionDto>>> Create(
        CreatePointTransactionRequest request,
        PointTransactionType type,
        CancellationToken cancellationToken)
    {
        try
        {
            var transaction = type == PointTransactionType.Earn
                ? await pointTransactionService.EarnAsync(request, cancellationToken)
                : await pointTransactionService.RedeemAsync(request, cancellationToken);
            return CreatedAtAction(
                nameof(GetById),
                new { id = transaction.Id },
                new ApiResponse<PointTransactionDto>(
                    transaction,
                    type == PointTransactionType.Earn
                        ? "Points earned."
                        : "Points redeemed."));
        }
        catch (PointTransactionCustomerNotFoundException exception)
        {
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Customer not found",
                detail: exception.Message);
        }
        catch (InsufficientCustomerPointsException exception)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Insufficient customer points",
                detail: exception.Message);
        }
    }
}
