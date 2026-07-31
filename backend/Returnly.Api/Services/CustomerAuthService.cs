using System.ComponentModel.DataAnnotations;
using System.Globalization;
using Microsoft.Extensions.Options;
using Returnly.Api.Configuration;
using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class CustomerAuthService(
    ICustomerAuthRepository repository,
    IQrCodeScanProcessor qrCodeScanProcessor,
    IVerificationCodeGenerator codeGenerator,
    IVerificationCodeHasher codeHasher,
    IEnumerable<ICustomerVerificationSender> senders,
    IOptions<CustomerAuthOptions> options,
    TimeProvider timeProvider)
    : ICustomerAuthService
{
    private const string NeutralMessage =
        "If the destination can receive Returnly verification codes, a code has been sent.";
    private readonly CustomerAuthOptions _options = options.Value;

    public async Task<CustomerVerificationChallengeDto> RequestCodeAsync(
        RequestCustomerVerificationCode request,
        CancellationToken cancellationToken = default)
    {
        var qrCode = await repository.GetQrCodeAsync(request.QrToken.Trim(), cancellationToken)
            ?? throw new QrCodeNotFoundException();
        EnsureQrAvailable(qrCode);

        var identifier = NormalizeIdentifier(request.Channel, request.Identifier);
        var sender = GetSender(request.Channel);
        var now = timeProvider.GetUtcNow();
        var existing = await repository.GetLatestActiveChallengeAsync(
            qrCode.RestaurantId,
            qrCode.Id,
            identifier,
            cancellationToken);

        if (existing is not null && existing.ExpiresAt > now)
        {
            if (existing.LastSentAt.AddSeconds(_options.ResendCooldownSeconds) <= now)
            {
                await RotateAndSendAsync(existing, sender, now, cancellationToken);
            }
            return ToChallengeDto(existing);
        }

        var challenge = new CustomerVerificationChallenge
        {
            RestaurantId = qrCode.RestaurantId,
            QrCodeId = qrCode.Id,
            Channel = request.Channel,
            NormalizedIdentifier = identifier,
            CodeHash = string.Empty,
            ExpiresAt = now.AddMinutes(_options.CodeLifetimeMinutes),
            LastSentAt = now,
            CreatedAt = now,
        };
        var code = codeGenerator.Generate();
        challenge.CodeHash = codeHasher.Hash(challenge.Id, code);
        await repository.AddChallengeAsync(challenge, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);
        await sender.SendAsync(identifier, code, challenge.ExpiresAt, cancellationToken);
        return ToChallengeDto(challenge);
    }

    public async Task<CustomerVerificationChallengeDto> ResendCodeAsync(
        ResendCustomerCodeRequest request,
        CancellationToken cancellationToken = default)
    {
        var challenge = await repository.GetChallengeAsync(request.ChallengeId, cancellationToken)
            ?? throw new VerificationChallengeNotFoundException();
        var now = timeProvider.GetUtcNow();
        if (challenge.ConsumedAt.HasValue)
        {
            throw new VerificationChallengeConsumedException();
        }
        if (challenge.LastSentAt.AddSeconds(_options.ResendCooldownSeconds) > now)
        {
            throw new VerificationResendCooldownException(
                challenge.LastSentAt.AddSeconds(_options.ResendCooldownSeconds));
        }

        await RotateAndSendAsync(challenge, GetSender(challenge.Channel), now, cancellationToken);
        return ToChallengeDto(challenge);
    }

    public async Task<CustomerVerificationResultDto> VerifyCodeAsync(
        VerifyCustomerCodeRequest request,
        CancellationToken cancellationToken = default)
    {
        var challenge = await repository.GetChallengeAsync(request.ChallengeId, cancellationToken)
            ?? throw new VerificationChallengeNotFoundException();
        var now = timeProvider.GetUtcNow();
        if (challenge.ConsumedAt.HasValue)
        {
            throw new VerificationChallengeConsumedException();
        }
        if (challenge.ExpiresAt <= now)
        {
            throw new VerificationChallengeExpiredException();
        }
        if (challenge.AttemptCount >= _options.MaxAttempts)
        {
            throw new VerificationAttemptsExceededException();
        }
        if (!codeHasher.Verify(challenge.Id, request.VerificationCode, challenge.CodeHash))
        {
            challenge.AttemptCount++;
            await repository.SaveChangesAsync(cancellationToken);
            if (challenge.AttemptCount >= _options.MaxAttempts)
            {
                throw new VerificationAttemptsExceededException();
            }
            throw new VerificationCodeInvalidException(
                _options.MaxAttempts - challenge.AttemptCount);
        }

        return await repository.ExecuteInTransactionAsync(async transactionCancellationToken =>
        {
            var customer = await repository.GetCustomerAsync(
                challenge.RestaurantId,
                challenge.Channel,
                challenge.NormalizedIdentifier,
                transactionCancellationToken);
            if (customer is null)
            {
                customer = CreateCustomer(challenge, now);
                await repository.AddCustomerAsync(customer, transactionCancellationToken);
                await repository.SaveChangesAsync(transactionCancellationToken);
            }

            var scan = await qrCodeScanProcessor.ScanAuthenticatedPublicAsync(
                challenge.RestaurantId,
                challenge.QrCode.Token,
                customer.Id,
                transactionCancellationToken);

            // The challenge is consumed only after the scan and point transaction
            // have been persisted. The surrounding transaction keeps those writes atomic.
            challenge.ConsumedAt = now;
            await repository.SaveChangesAsync(transactionCancellationToken);
            return ToResult(scan, customer, challenge);
        }, cancellationToken);
    }

    public async Task<CustomerVerificationResultDto> TrustedScanAsync(
        Guid restaurantId,
        Guid customerId,
        TrustedCustomerScanRequest request,
        CancellationToken cancellationToken = default)
    {
        var qrCode = await repository.GetQrCodeAsync(
            request.QrToken.Trim(), cancellationToken)
            ?? throw new QrCodeNotFoundException();
        if (qrCode.RestaurantId != restaurantId)
        {
            throw new TrustedCustomerTenantMismatchException(
                restaurantId, qrCode.RestaurantId);
        }
        var scan = await qrCodeScanProcessor.ScanAuthenticatedPublicAsync(
            restaurantId,
            request.QrToken.Trim(),
            customerId,
            cancellationToken);

        return new CustomerVerificationResultDto(
            scan.CustomerPortalToken,
            scan.CustomerPortalTokenExpiresAt,
            new VerifiedCustomerSummaryDto(customerId, scan.CustomerFirstName, "Trusted device"),
            scan.RestaurantName,
            scan.RestaurantLogoUrl,
            scan.PrimaryBrandColor,
            scan.PointsAwarded,
            scan.CurrentPoints,
            scan.ScannedAt);
    }

    private async Task RotateAndSendAsync(
        CustomerVerificationChallenge challenge,
        ICustomerVerificationSender sender,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (challenge.ResendCount >= _options.MaxResends)
        {
            throw new VerificationResendsExceededException();
        }
        var code = codeGenerator.Generate();
        challenge.CodeHash = codeHasher.Hash(challenge.Id, code);
        challenge.ExpiresAt = now.AddMinutes(_options.CodeLifetimeMinutes);
        challenge.LastSentAt = now;
        challenge.ResendCount++;
        challenge.AttemptCount = 0;
        await repository.SaveChangesAsync(cancellationToken);
        await sender.SendAsync(
            challenge.NormalizedIdentifier,
            code,
            challenge.ExpiresAt,
            cancellationToken);
    }

    private ICustomerVerificationSender GetSender(VerificationChannel channel)
    {
        var sender = senders.SingleOrDefault(candidate => candidate.Channel == channel);
        if (sender is null || !sender.IsConfigured)
        {
            throw new VerificationChannelUnavailableException();
        }
        return sender;
    }

    private static string NormalizeIdentifier(
        VerificationChannel channel,
        string value)
    {
        var trimmed = value.Trim();
        if (channel == VerificationChannel.Email)
        {
            if (!new EmailAddressAttribute().IsValid(trimmed))
            {
                throw new VerificationIdentifierInvalidException();
            }
            return trimmed.ToLowerInvariant();
        }

        var digits = new string(trimmed.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("961", StringComparison.Ordinal))
        {
            digits = digits[3..];
        }
        var prefixes = new HashSet<string>(StringComparer.Ordinal)
            { "70", "71", "76", "78", "79", "81" };
        if (digits.Length != 8 || !prefixes.Contains(digits[..2]))
        {
            throw new VerificationIdentifierInvalidException();
        }
        return $"+961{digits}";
    }

    private static void EnsureQrAvailable(QrCode qrCode)
    {
        if (!qrCode.Restaurant.IsActive)
        {
            throw new QrCodeNotFoundException();
        }
        if (!qrCode.IsActive)
        {
            throw new QrCodeInactiveException();
        }
        if (qrCode.ExpiresAt.HasValue && qrCode.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            throw new QrCodeExpiredException();
        }
    }

    private static Customer CreateCustomer(
        CustomerVerificationChallenge challenge,
        DateTimeOffset now)
    {
        var firstName = challenge.Channel == VerificationChannel.Email
            ? FriendlyName(challenge.NormalizedIdentifier.Split('@')[0])
            : "Guest";
        return new Customer
        {
            RestaurantId = challenge.RestaurantId,
            FirstName = firstName,
            LastName = string.Empty,
            Email = challenge.Channel == VerificationChannel.Email
                ? challenge.NormalizedIdentifier
                : $"{challenge.Id:N}@phone.returnly.local",
            PhoneNumber = challenge.Channel == VerificationChannel.Phone
                ? challenge.NormalizedIdentifier
                : string.Empty,
            Status = CustomerStatus.New,
            CreatedAt = now,
        };
    }

    private static string FriendlyName(string localPart)
    {
        var words = localPart.Split(['.', '_', '-'], StringSplitOptions.RemoveEmptyEntries);
        var candidate = words.FirstOrDefault() ?? "Guest";
        return CultureInfo.InvariantCulture.TextInfo.ToTitleCase(candidate.ToLowerInvariant())[..Math.Min(100, candidate.Length)];
    }

    private CustomerVerificationChallengeDto ToChallengeDto(
        CustomerVerificationChallenge challenge) =>
        new(
            challenge.Id,
            NeutralMessage,
            Mask(challenge.Channel, challenge.NormalizedIdentifier),
            challenge.ExpiresAt,
            challenge.LastSentAt.AddSeconds(_options.ResendCooldownSeconds));

    private static CustomerVerificationResultDto ToResult(
        PublicQrScanResultDto scan,
        Customer customer,
        CustomerVerificationChallenge challenge) =>
        new(
            scan.CustomerPortalToken,
            scan.CustomerPortalTokenExpiresAt,
            new VerifiedCustomerSummaryDto(
                customer.Id,
                customer.FirstName,
                Mask(challenge.Channel, challenge.NormalizedIdentifier)),
            scan.RestaurantName,
            scan.RestaurantLogoUrl,
            scan.PrimaryBrandColor,
            scan.PointsAwarded,
            scan.CurrentPoints,
            scan.ScannedAt);

    private static string Mask(VerificationChannel channel, string identifier)
    {
        if (channel == VerificationChannel.Phone)
        {
            return identifier.Length > 4
                ? $"{identifier[..4]} •••• {identifier[^4..]}"
                : "••••";
        }
        var parts = identifier.Split('@');
        var local = parts[0];
        var visible = local.Length <= 2 ? local[0].ToString() : local[..2];
        return $"{visible}{new string('•', Math.Max(2, local.Length - visible.Length))}@{parts[1]}";
    }

}

public sealed class VerificationIdentifierInvalidException : Exception;
public sealed class VerificationChannelUnavailableException : Exception;
public sealed class VerificationChallengeNotFoundException : Exception;
public sealed class VerificationChallengeExpiredException : Exception;
public sealed class VerificationChallengeConsumedException : Exception;
public sealed class VerificationAttemptsExceededException : Exception;
public sealed class VerificationResendsExceededException : Exception;
public sealed class VerificationCodeInvalidException(int attemptsRemaining) : Exception
{
    public int AttemptsRemaining { get; } = attemptsRemaining;
}
public sealed class VerificationResendCooldownException(DateTimeOffset availableAt) : Exception
{
    public DateTimeOffset AvailableAt { get; } = availableAt;
}
public sealed class TrustedCustomerTenantMismatchException(
    Guid tokenRestaurantId,
    Guid qrRestaurantId) : Exception
{
    public Guid TokenRestaurantId { get; } = tokenRestaurantId;
    public Guid QrRestaurantId { get; } = qrRestaurantId;
}
