using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Returnly.Api.DTOs;
using Returnly.Api.Interfaces;
using Returnly.Api.Services;

namespace Returnly.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/qr-codes")]
public sealed class QrCodesController(IQrCodeService qrCodeService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResponse<QrCodeDto>>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<QrCodeDto>>>> GetAll(
        [FromQuery] QrCodeQueryParameters query,
        CancellationToken cancellationToken)
    {
        var qrCodes = await qrCodeService.GetPagedAsync(query, cancellationToken);
        return Ok(new ApiResponse<PagedResponse<QrCodeDto>>(qrCodes));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<QrCodeDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<QrCodeDto>>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var qrCode = await qrCodeService.GetByIdAsync(id, cancellationToken);
        return qrCode is null
            ? NotFound()
            : Ok(new ApiResponse<QrCodeDto>(qrCode));
    }

    [HttpPost]
    [ProducesResponseType<ApiResponse<QrCodeDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApiResponse<QrCodeDto>>> Create(
        [FromBody] CreateQrCodeRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var qrCode = await qrCodeService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(
                nameof(GetById),
                new { id = qrCode.Id },
                new ApiResponse<QrCodeDto>(qrCode, "QR code created."));
        }
        catch (QrCodeNameConflictException exception)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "QR code already exists",
                detail: exception.Message);
        }
    }

    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType<ApiResponse<QrCodeDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<QrCodeDto>>> SetStatus(
        Guid id,
        [FromBody] SetQrCodeStatusRequest request,
        CancellationToken cancellationToken)
    {
        var qrCode = await qrCodeService.SetStatusAsync(id, request, cancellationToken);
        return qrCode is null
            ? NotFound()
            : Ok(new ApiResponse<QrCodeDto>(qrCode, "QR code status updated."));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        return await qrCodeService.DeleteAsync(id, cancellationToken)
            ? NoContent()
            : NotFound();
    }

    [HttpPost("scan")]
    [ProducesResponseType<ApiResponse<QrCodeScanResultDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApiResponse<QrCodeScanResultDto>>> Scan(
        [FromBody] ScanQrCodeRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await qrCodeService.ScanAsync(request, cancellationToken);
            return Ok(new ApiResponse<QrCodeScanResultDto>(
                result,
                "QR code validated and points awarded."));
        }
        catch (QrCodeNotFoundException exception)
        {
            return NotFoundProblem("QR code not found", exception.Message);
        }
        catch (QrCodeCustomerNotFoundException exception)
        {
            return NotFoundProblem("Customer not found", exception.Message);
        }
        catch (QrCodeInactiveException exception)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "QR code inactive",
                detail: exception.Message);
        }
    }

    private ObjectResult NotFoundProblem(string title, string detail) =>
        Problem(
            statusCode: StatusCodes.Status404NotFound,
            title: title,
            detail: detail);
}
