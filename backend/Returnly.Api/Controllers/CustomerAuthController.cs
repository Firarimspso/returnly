using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Returnly.Api.DTOs;
using Returnly.Api.Interfaces;
using Returnly.Api.Services;

namespace Returnly.Api.Controllers;

[ApiController]
[Route("api/public/customer-auth")]
[EnableRateLimiting("PublicCustomerAuth")]
public sealed class CustomerAuthController(
    ICustomerAuthService customerAuthService,
    IHostEnvironment environment,
    ILogger<CustomerAuthController> logger)
    : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("request-code")]
    [ProducesResponseType<ApiResponse<CustomerVerificationChallengeDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<CustomerVerificationChallengeDto>>> RequestCode(
        [FromBody] RequestCustomerVerificationCode request,
        CancellationToken cancellationToken)
    {
        try
        {
            var challenge = await customerAuthService.RequestCodeAsync(request, cancellationToken);
            return Ok(new ApiResponse<CustomerVerificationChallengeDto>(challenge));
        }
        catch (VerificationIdentifierInvalidException)
        {
            return PublicProblem(400, "invalid_identifier", "Check the email address or phone number.");
        }
        catch (VerificationChannelUnavailableException)
        {
            return PublicProblem(
                503,
                "channel_unavailable",
                "That verification method is not available yet. Please use email.");
        }
        catch (Exception exception) when (IsQrAvailabilityException(exception))
        {
            return QrProblem(exception);
        }
    }

    [AllowAnonymous]
    [HttpPost("verify-code")]
    [ProducesResponseType<ApiResponse<CustomerVerificationResultDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<CustomerVerificationResultDto>>> VerifyCode(
        [FromBody] VerifyCustomerCodeRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await customerAuthService.VerifyCodeAsync(request, cancellationToken);
            StoreTrustedCustomerSession(result);
            return Ok(new ApiResponse<CustomerVerificationResultDto>(
                result,
                "Your email has been verified and points were added."));
        }
        catch (VerificationCodeInvalidException exception)
        {
            return PublicProblem(
                400,
                "invalid_code",
                $"That code is not correct. {exception.AttemptsRemaining} attempts remaining.");
        }
        catch (VerificationChallengeExpiredException)
        {
            return PublicProblem(410, "code_expired", "That code has expired. Request a new code.");
        }
        catch (VerificationChallengeConsumedException)
        {
            return PublicProblem(409, "code_used", "That code has already been used.");
        }
        catch (VerificationAttemptsExceededException)
        {
            return PublicProblem(
                429,
                "too_many_attempts",
                "Too many incorrect attempts. Request a new verification code.");
        }
        catch (VerificationChallengeNotFoundException)
        {
            return PublicProblem(404, "challenge_unavailable", "That verification request is unavailable.");
        }
        catch (QrCodeDuplicateScanException exception)
        {
            return PublicProblem(429, "duplicate_scan", exception.Message);
        }
        catch (Exception exception) when (IsQrAvailabilityException(exception))
        {
            return QrProblem(exception);
        }
    }

    [AllowAnonymous]
    [HttpPost("resend-code")]
    [ProducesResponseType<ApiResponse<CustomerVerificationChallengeDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<CustomerVerificationChallengeDto>>> ResendCode(
        [FromBody] ResendCustomerCodeRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var challenge = await customerAuthService.ResendCodeAsync(request, cancellationToken);
            return Ok(new ApiResponse<CustomerVerificationChallengeDto>(challenge));
        }
        catch (VerificationResendCooldownException exception)
        {
            return PublicProblem(
                429,
                "resend_cooldown",
                $"A new code can be requested after {exception.AvailableAt:O}.");
        }
        catch (VerificationResendsExceededException)
        {
            return PublicProblem(
                429,
                "resend_limit",
                "The resend limit has been reached. Start again to request a new code.");
        }
        catch (VerificationChallengeExpiredException)
        {
            return PublicProblem(410, "code_expired", "That verification request has expired.");
        }
        catch (VerificationChallengeConsumedException)
        {
            return PublicProblem(409, "code_used", "That verification request is already complete.");
        }
        catch (VerificationChallengeNotFoundException)
        {
            return PublicProblem(404, "challenge_unavailable", "That verification request is unavailable.");
        }
        catch (VerificationChannelUnavailableException)
        {
            return PublicProblem(503, "channel_unavailable", "Email delivery is not configured.");
        }
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    [ProducesResponseType<ApiResponse<bool>>(StatusCodes.Status200OK)]
    public ActionResult<ApiResponse<bool>> Logout()
    {
        var cookiePresent = Request.Cookies.ContainsKey(CustomerPortalTokenService.CookieName);
        if (environment.IsDevelopment())
        {
            logger.LogWarning(
                "[DEV CUSTOMER SESSION] logout request received. CookiePresent={CookiePresent}",
                cookiePresent);
        }

        ClearTrustedCustomerSession();

        if (environment.IsDevelopment())
        {
            logger.LogWarning(
                "[DEV CUSTOMER SESSION] logout cookie expiration sent. Name={Name} Path={Path} SameSite={SameSite} Secure={Secure} ResponseStatus={ResponseStatus}",
                CustomerPortalTokenService.CookieName,
                "/api/public",
                SameSiteMode.Lax,
                !environment.IsDevelopment() || Request.IsHttps,
                StatusCodes.Status200OK);
        }

        return Ok(new ApiResponse<bool>(true, "Customer session ended."));
    }

    [Authorize(AuthenticationSchemes = CustomerPortalTokenService.AuthenticationScheme)]
    [HttpPost("trusted-scan")]
    [ProducesResponseType<ApiResponse<CustomerVerificationResultDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<CustomerVerificationResultDto>>> TrustedScan(
        [FromBody] TrustedCustomerScanRequest request,
        CancellationToken cancellationToken)
    {
        if (environment.IsDevelopment())
        {
            logger.LogWarning(
                "[DEV CUSTOMER SESSION] trusted-scan CookiePresent={CookiePresent} BearerPresent={BearerPresent} AuthenticationSucceeded={Authenticated}",
                Request.Cookies.ContainsKey(CustomerPortalTokenService.CookieName),
                Request.Headers.Authorization.ToString().StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase),
                User.Identity?.IsAuthenticated == true);
        }
        if (!TryGetCustomerContext(out var restaurantId, out var customerId))
        {
            return Unauthorized();
        }
        try
        {
            var result = await customerAuthService.TrustedScanAsync(
                restaurantId,
                customerId,
                request,
                cancellationToken);
            StoreTrustedCustomerSession(result);
            if (environment.IsDevelopment())
            {
                logger.LogWarning(
                    "[DEV CUSTOMER SESSION] trusted-scan accepted. TokenRestaurant={RestaurantId} QRRestaurantMatch=true Customer={CustomerId}",
                    restaurantId,
                    customerId);
            }
            return Ok(new ApiResponse<CustomerVerificationResultDto>(
                result,
                "Points awarded using your trusted customer session."));
        }
        catch (QrCodeDuplicateScanException exception)
        {
            return PublicProblem(429, "duplicate_scan", exception.Message);
        }
        catch (QrCodeCustomerNotFoundException)
        {
            ClearTrustedCustomerSession();
            return Unauthorized();
        }
        catch (TrustedCustomerTenantMismatchException exception)
        {
            if (environment.IsDevelopment())
            {
                logger.LogWarning(
                    "[DEV CUSTOMER SESSION] trusted-scan rejected: tenant_mismatch. TokenRestaurant={TokenRestaurant} QRRestaurant={QrRestaurant}. Frontend will fall back to OTP.",
                    exception.TokenRestaurantId,
                    exception.QrRestaurantId);
            }
            ClearTrustedCustomerSession();
            return QrProblem(new QrCodeNotFoundException());
        }
        catch (QrCodeNotFoundException)
        {
            ClearTrustedCustomerSession();
            return QrProblem(new QrCodeNotFoundException());
        }
        catch (Exception exception) when (IsQrAvailabilityException(exception))
        {
            return QrProblem(exception);
        }
    }

    private bool TryGetCustomerContext(out Guid restaurantId, out Guid customerId)
    {
        customerId = Guid.Empty;
        return Guid.TryParse(User.FindFirst("restaurant_id")?.Value, out restaurantId)
        && Guid.TryParse(
            User.FindFirst("customer_id")?.Value
                ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value,
            out customerId);
    }

    private ObjectResult QrProblem(Exception exception) =>
        exception switch
        {
            QrCodeInactiveException => PublicProblem(409, "qr_inactive", "This QR code is inactive."),
            QrCodeExpiredException => PublicProblem(410, "qr_expired", "This QR code has expired."),
            _ => PublicProblem(404, "qr_not_found", "This QR code is unavailable."),
        };

    private static bool IsQrAvailabilityException(Exception exception) =>
        exception is QrCodeNotFoundException
            or QrCodeInactiveException
            or QrCodeExpiredException;

    private ObjectResult PublicProblem(int status, string code, string detail)
    {
        var problem = new ProblemDetails
        {
            Status = status,
            Title = "Customer verification",
            Detail = detail,
        };
        problem.Extensions["code"] = code;
        return StatusCode(status, problem);
    }

    private void StoreTrustedCustomerSession(CustomerVerificationResultDto result)
    {
        var secure = !environment.IsDevelopment() || Request.IsHttps;
        var maxAge = result.CustomerPortalTokenExpiresAt - DateTimeOffset.UtcNow;
        if (environment.IsDevelopment())
        {
            logger.LogWarning(
                "[DEV CUSTOMER SESSION] verify/trusted response setting HttpOnly cookie. Name={Name} Path={Path} SameSite={SameSite} Secure={Secure} Expires={Expires:O} MaxAge={MaxAge}",
                CustomerPortalTokenService.CookieName,
                "/api/public",
                SameSiteMode.Lax,
                secure,
                result.CustomerPortalTokenExpiresAt,
                maxAge);
        }
        Response.Cookies.Append(
            CustomerPortalTokenService.CookieName,
            result.CustomerPortalToken,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = SameSiteMode.Lax,
                Path = "/api/public",
                Expires = result.CustomerPortalTokenExpiresAt,
                MaxAge = maxAge,
                IsEssential = true,
            });
    }

    private void ClearTrustedCustomerSession()
    {
        Response.Cookies.Delete(
            CustomerPortalTokenService.CookieName,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = !environment.IsDevelopment() || Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Path = "/api/public",
                IsEssential = true,
            });
    }
}
