using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Returnly.Api.DTOs;
using Returnly.Api.Interfaces;
using Returnly.Api.Services;

namespace Returnly.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/public/qr")]
public sealed class PublicQrController(IPublicQrCodeService publicQrCodeService)
    : ControllerBase
{
    [HttpGet("{token}")]
    [ProducesResponseType<ApiResponse<PublicQrCodeDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status410Gone)]
    public async Task<ActionResult<ApiResponse<PublicQrCodeDto>>> Validate(
        string token,
        CancellationToken cancellationToken)
    {
        try
        {
            var qrCode = await publicQrCodeService.ValidateAsync(token, cancellationToken);
            return Ok(new ApiResponse<PublicQrCodeDto>(qrCode));
        }
        catch (Exception exception) when (IsQrAvailabilityException(exception))
        {
            return AvailabilityProblem(exception);
        }
    }

    [HttpPost("{token}/scan")]
    [ProducesResponseType<ApiResponse<PublicQrScanResultDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status410Gone)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<ApiResponse<PublicQrScanResultDto>>> Scan(
        string token,
        [FromBody] PublicQrScanRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await publicQrCodeService.ScanAsync(
                token, request, cancellationToken);
            return Ok(new ApiResponse<PublicQrScanResultDto>(
                result,
                "Points awarded."));
        }
        catch (QrCodeCustomerNotFoundException exception)
        {
            return PublicProblem(
                StatusCodes.Status404NotFound,
                "customer_not_found",
                "Customer profile not found",
                exception.Message);
        }
        catch (QrCodeDuplicateScanException exception)
        {
            return PublicProblem(
                StatusCodes.Status429TooManyRequests,
                "duplicate_scan",
                "Points already awarded",
                exception.Message);
        }
        catch (Exception exception) when (IsQrAvailabilityException(exception))
        {
            return AvailabilityProblem(exception);
        }
    }

    private ObjectResult AvailabilityProblem(Exception exception) =>
        exception switch
        {
            QrCodeInactiveException => PublicProblem(
                StatusCodes.Status409Conflict,
                "qr_inactive",
                "QR code inactive",
                "This QR code is currently inactive. Please ask the restaurant for help."),
            QrCodeExpiredException => PublicProblem(
                StatusCodes.Status410Gone,
                "qr_expired",
                "QR code expired",
                "This QR code has expired. Please ask the restaurant for a new code."),
            _ => PublicProblem(
                StatusCodes.Status404NotFound,
                "qr_not_found",
                "QR code unavailable",
                "This QR code is invalid or has been deleted."),
        };

    private static bool IsQrAvailabilityException(Exception exception) =>
        exception is QrCodeNotFoundException
            or QrCodeInactiveException
            or QrCodeExpiredException;

    private ObjectResult PublicProblem(
        int status,
        string code,
        string title,
        string detail)
    {
        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
        };
        problem.Extensions["code"] = code;
        return StatusCode(status, problem);
    }
}
