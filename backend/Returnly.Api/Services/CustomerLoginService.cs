using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using Returnly.Api.Configuration;
using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class CustomerLoginService(
    ICustomerLoginRepository repository,
    IVerificationCodeGenerator codeGenerator,
    IVerificationCodeHasher codeHasher,
    IEnumerable<ICustomerVerificationSender> senders,
    ICustomerPortalTokenService tokenService,
    IOptions<CustomerAuthOptions> options,
    TimeProvider timeProvider) : ICustomerLoginService
{
    private const string NeutralMessage =
        "If the email can receive Returnly verification codes, a code has been sent.";
    private static readonly TimeSpan SelectionLifetime = TimeSpan.FromMinutes(10);
    private readonly CustomerAuthOptions _options = options.Value;

    public async Task<CustomerVerificationChallengeDto> RequestCodeAsync(
        RequestCustomerLoginCode request,
        CancellationToken cancellationToken = default)
    {
        var email = NormalizeEmail(request.Email);
        var sender = GetEmailSender();
        var now = timeProvider.GetUtcNow();
        var existing = await repository.GetLatestActiveAsync(email, cancellationToken);
        if (existing is not null && existing.ExpiresAt > now)
        {
            if (existing.LastSentAt.AddSeconds(_options.ResendCooldownSeconds) <= now)
            {
                await RotateAndSendAsync(existing, sender, now, cancellationToken);
            }
            return ToChallenge(existing);
        }

        var challenge = new CustomerLoginChallenge
        {
            NormalizedEmail = email,
            CodeHash = string.Empty,
            ExpiresAt = now.AddMinutes(_options.CodeLifetimeMinutes),
            LastSentAt = now,
            CreatedAt = now,
        };
        var code = codeGenerator.Generate();
        challenge.CodeHash = codeHasher.Hash(challenge.Id, code);
        await repository.AddAsync(challenge, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);
        await sender.SendAsync(email, code, challenge.ExpiresAt, cancellationToken);
        return ToChallenge(challenge);
    }

    public async Task<CustomerVerificationChallengeDto> ResendCodeAsync(
        ResendCustomerLoginCode request,
        CancellationToken cancellationToken = default)
    {
        var challenge = await repository.GetChallengeAsync(request.ChallengeId, cancellationToken)
            ?? throw new VerificationChallengeNotFoundException();
        var now = timeProvider.GetUtcNow();
        if (challenge.ConsumedAt.HasValue) throw new VerificationChallengeConsumedException();
        if (challenge.LastSentAt.AddSeconds(_options.ResendCooldownSeconds) > now)
        {
            throw new VerificationResendCooldownException(
                challenge.LastSentAt.AddSeconds(_options.ResendCooldownSeconds));
        }
        await RotateAndSendAsync(challenge, GetEmailSender(), now, cancellationToken);
        return ToChallenge(challenge);
    }

    public async Task<CustomerLoginResultDto> VerifyCodeAsync(
        VerifyCustomerLoginCode request,
        CancellationToken cancellationToken = default)
    {
        var challenge = await repository.GetChallengeAsync(request.ChallengeId, cancellationToken)
            ?? throw new VerificationChallengeNotFoundException();
        var now = timeProvider.GetUtcNow();
        if (challenge.ConsumedAt.HasValue) throw new VerificationChallengeConsumedException();
        if (challenge.ExpiresAt <= now) throw new VerificationChallengeExpiredException();
        if (challenge.AttemptCount >= _options.MaxAttempts)
            throw new VerificationAttemptsExceededException();
        if (!codeHasher.Verify(challenge.Id, request.VerificationCode, challenge.CodeHash))
        {
            challenge.AttemptCount++;
            await repository.SaveChangesAsync(cancellationToken);
            if (challenge.AttemptCount >= _options.MaxAttempts)
                throw new VerificationAttemptsExceededException();
            throw new VerificationCodeInvalidException(
                _options.MaxAttempts - challenge.AttemptCount);
        }

        challenge.ConsumedAt = now;
        challenge.VerifiedAt = now;
        var customers = await repository.GetCustomersByEmailAsync(
            challenge.NormalizedEmail, cancellationToken);
        if (customers.Count == 1)
        {
            await repository.SaveChangesAsync(cancellationToken);
            return Authenticated(customers[0]);
        }
        if (customers.Count == 0)
        {
            await repository.SaveChangesAsync(cancellationToken);
            return new CustomerLoginResultDto(
                CustomerLoginResultStatus.NoAccount,
                null, null, null, null, []);
        }

        var selectionToken = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        challenge.SelectionTokenHash = HashSelectionToken(selectionToken);
        challenge.SelectionExpiresAt = now.Add(SelectionLifetime);
        await repository.SaveChangesAsync(cancellationToken);
        return new CustomerLoginResultDto(
            CustomerLoginResultStatus.SelectRestaurant,
            null,
            null,
            selectionToken,
            challenge.SelectionExpiresAt,
            customers.Select(ToOption).ToArray());
    }

    public async Task<CustomerLoginResultDto> SelectRestaurantAsync(
        SelectCustomerRestaurantRequest request,
        CancellationToken cancellationToken = default)
    {
        var challenge = await repository.GetBySelectionHashAsync(
            HashSelectionToken(request.SelectionToken), cancellationToken)
            ?? throw new VerificationChallengeNotFoundException();
        var now = timeProvider.GetUtcNow();
        if (!challenge.VerifiedAt.HasValue
            || !challenge.SelectionExpiresAt.HasValue
            || challenge.SelectionExpiresAt <= now)
        {
            throw new VerificationChallengeExpiredException();
        }
        var customers = await repository.GetCustomersByEmailAsync(
            challenge.NormalizedEmail, cancellationToken);
        var customer = customers.SingleOrDefault(
            item => string.Equals(item.Id.ToString("N"), request.CustomerKey,
                StringComparison.OrdinalIgnoreCase))
            ?? throw new VerificationChallengeNotFoundException();
        challenge.SelectionTokenHash = null;
        challenge.SelectionExpiresAt = null;
        await repository.SaveChangesAsync(cancellationToken);
        return Authenticated(customer);
    }

    private CustomerLoginResultDto Authenticated(Customer customer)
    {
        var token = tokenService.Generate(customer);
        return new CustomerLoginResultDto(
            CustomerLoginResultStatus.Authenticated,
            token.Value,
            token.ExpiresAt,
            null,
            null,
            [ToOption(customer)]);
    }

    private async Task RotateAndSendAsync(
        CustomerLoginChallenge challenge,
        ICustomerVerificationSender sender,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (challenge.ResendCount >= _options.MaxResends)
            throw new VerificationResendsExceededException();
        var code = codeGenerator.Generate();
        challenge.CodeHash = codeHasher.Hash(challenge.Id, code);
        challenge.ExpiresAt = now.AddMinutes(_options.CodeLifetimeMinutes);
        challenge.LastSentAt = now;
        challenge.ResendCount++;
        challenge.AttemptCount = 0;
        await repository.SaveChangesAsync(cancellationToken);
        await sender.SendAsync(
            challenge.NormalizedEmail, code, challenge.ExpiresAt, cancellationToken);
    }

    private ICustomerVerificationSender GetEmailSender() =>
        senders.SingleOrDefault(sender => sender.Channel == VerificationChannel.Email
            && sender.IsConfigured)
        ?? throw new VerificationChannelUnavailableException();

    private static string NormalizeEmail(string value)
    {
        var email = value.Trim().ToLowerInvariant();
        if (!new EmailAddressAttribute().IsValid(email))
            throw new VerificationIdentifierInvalidException();
        return email;
    }

    private CustomerVerificationChallengeDto ToChallenge(CustomerLoginChallenge challenge) =>
        new(
            challenge.Id,
            NeutralMessage,
            MaskEmail(challenge.NormalizedEmail),
            challenge.ExpiresAt,
            challenge.LastSentAt.AddSeconds(_options.ResendCooldownSeconds));

    private static CustomerRestaurantOptionDto ToOption(Customer customer) =>
        new(
            customer.Id.ToString("N"),
            customer.Restaurant.Name,
            customer.Restaurant.LogoUrl,
            customer.Restaurant.PrimaryBrandColor,
            customer.CurrentPoints);

    private static string MaskEmail(string email)
    {
        var parts = email.Split('@');
        var visible = parts[0][..Math.Min(2, parts[0].Length)];
        return $"{visible}***@{parts[1]}";
    }

    private static string HashSelectionToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
