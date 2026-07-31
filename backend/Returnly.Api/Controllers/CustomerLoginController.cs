using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Returnly.Api.DTOs;
using Returnly.Api.Interfaces;
using Returnly.Api.Services;

namespace Returnly.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/public/customer-login")]
[EnableRateLimiting("PublicCustomerAuth")]
public sealed class CustomerLoginController(
    ICustomerLoginService service,
    IHostEnvironment environment,
    ILogger<CustomerLoginController> logger) : ControllerBase
{
    [HttpPost("request-code")]
    public async Task<ActionResult<ApiResponse<CustomerVerificationChallengeDto>>> RequestCode(
        [FromBody] RequestCustomerLoginCode request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(new ApiResponse<CustomerVerificationChallengeDto>(
                await service.RequestCodeAsync(request, cancellationToken)));
        }
        catch (VerificationIdentifierInvalidException)
        {
            return ProblemResult(400, "invalid_identifier", "Enter a valid email address.");
        }
        catch (VerificationChannelUnavailableException)
        {
            return ProblemResult(503, "channel_unavailable", "Email verification is unavailable.");
        }
    }

    [HttpPost("resend-code")]
    public async Task<ActionResult<ApiResponse<CustomerVerificationChallengeDto>>> ResendCode(
        [FromBody] ResendCustomerLoginCode request,
        CancellationToken cancellationToken)
    {
        try
        {
            return Ok(new ApiResponse<CustomerVerificationChallengeDto>(
                await service.ResendCodeAsync(request, cancellationToken)));
        }
        catch (Exception exception)
        {
            return ChallengeProblem(exception);
        }
    }

    [HttpPost("verify-code")]
    public async Task<ActionResult<ApiResponse<CustomerLoginResultDto>>> VerifyCode(
        [FromBody] VerifyCustomerLoginCode request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.VerifyCodeAsync(request, cancellationToken);
            StoreSessionIfAuthenticated(result);
            return Ok(new ApiResponse<CustomerLoginResultDto>(result));
        }
        catch (Exception exception)
        {
            return ChallengeProblem(exception);
        }
    }

    [HttpPost("select-restaurant")]
    public async Task<ActionResult<ApiResponse<CustomerLoginResultDto>>> SelectRestaurant(
        [FromBody] SelectCustomerRestaurantRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await service.SelectRestaurantAsync(request, cancellationToken);
            StoreSessionIfAuthenticated(result);
            return Ok(new ApiResponse<CustomerLoginResultDto>(result));
        }
        catch (Exception exception)
        {
            return ChallengeProblem(exception);
        }
    }

    private ObjectResult ChallengeProblem(Exception exception) => exception switch
    {
        VerificationCodeInvalidException invalid => ProblemResult(
            400, "invalid_code", $"That code is incorrect. {invalid.AttemptsRemaining} attempts remaining."),
        VerificationChallengeExpiredException => ProblemResult(
            410, "code_expired", "That verification session has expired."),
        VerificationChallengeConsumedException => ProblemResult(
            409, "code_used", "That code has already been used."),
        VerificationAttemptsExceededException => ProblemResult(
            429, "too_many_attempts", "Too many incorrect attempts."),
        VerificationResendCooldownException cooldown => ProblemResult(
            429, "resend_cooldown", $"A new code is available after {cooldown.AvailableAt:O}."),
        VerificationResendsExceededException => ProblemResult(
            429, "resend_limit", "The resend limit has been reached."),
        _ => ProblemResult(404, "challenge_unavailable", "That verification session is unavailable."),
    };

    private ObjectResult ProblemResult(int status, string code, string detail)
    {
        var problem = new ProblemDetails
        {
            Status = status,
            Title = "Customer rewards login",
            Detail = detail,
        };
        problem.Extensions["code"] = code;
        return StatusCode(status, problem);
    }

    private void StoreSessionIfAuthenticated(CustomerLoginResultDto result)
    {
        if (result.Status != CustomerLoginResultStatus.Authenticated
            || string.IsNullOrWhiteSpace(result.CustomerPortalToken)
            || !result.CustomerPortalTokenExpiresAt.HasValue)
        {
            return;
        }
        var secure = !environment.IsDevelopment() || Request.IsHttps;
        var maxAge = result.CustomerPortalTokenExpiresAt.Value - DateTimeOffset.UtcNow;
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
        if (environment.IsDevelopment())
        {
            logger.LogWarning(
                "[DEV CUSTOMER SESSION] standalone login set cookie Name={Name} Path={Path} SameSite={SameSite} Secure={Secure} Expires={Expires:O} MaxAge={MaxAge}",
                CustomerPortalTokenService.CookieName,
                "/api/public",
                SameSiteMode.Lax,
                secure,
                result.CustomerPortalTokenExpiresAt,
                maxAge);
        }
    }
}
