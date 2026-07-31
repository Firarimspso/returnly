using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Returnly.Api.Configuration;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class CryptographicVerificationCodeGenerator : IVerificationCodeGenerator
{
    public string Generate() =>
        RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
}

public sealed class HmacVerificationCodeHasher(IOptions<CustomerAuthOptions> options)
    : IVerificationCodeHasher
{
    private readonly byte[] _key = Encoding.UTF8.GetBytes(options.Value.CodeHashSecret);

    public string Hash(Guid challengeId, string code)
    {
        using var hmac = new HMACSHA256(_key);
        return Convert.ToHexString(hmac.ComputeHash(
            Encoding.UTF8.GetBytes($"{challengeId:N}:{code}")));
    }

    public bool Verify(Guid challengeId, string code, string expectedHash)
    {
        var actual = Convert.FromHexString(Hash(challengeId, code));
        byte[] expected;
        try
        {
            expected = Convert.FromHexString(expectedHash);
        }
        catch (FormatException)
        {
            return false;
        }
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}

public sealed class DevelopmentEmailVerificationSender(
    IHostEnvironment environment,
    IOptions<CustomerAuthOptions> options)
    : ICustomerVerificationSender
{
    private static readonly object ConsoleLock = new();

    public VerificationChannel Channel => VerificationChannel.Email;
    public bool IsConfigured => environment.IsDevelopment() && options.Value.EmailEnabled;

    public Task SendAsync(
        string destination,
        string code,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
        {
            throw new VerificationChannelUnavailableException();
        }

        var expiresInMinutes = Math.Max(
            1,
            (int)Math.Ceiling((expiresAt - DateTimeOffset.UtcNow).TotalMinutes));
        var maskedDestination = MaskEmail(destination);

        lock (ConsoleLock)
        {
            Console.Out.WriteLine("========================================================");
            Console.Out.WriteLine("[DEV OTP]");
            Console.Out.WriteLine($"Email: {maskedDestination}");
            Console.Out.WriteLine($"Code: {code}");
            Console.Out.WriteLine($"Expires: {expiresInMinutes} minutes");
            Console.Out.WriteLine("========================================================");
        }
        return Task.CompletedTask;
    }

    private static string MaskEmail(string destination)
    {
        var parts = destination.Split('@', 2);
        if (parts.Length != 2 || parts[0].Length == 0)
        {
            return "***";
        }

        var visibleCharacters = Math.Min(2, parts[0].Length);
        return $"{parts[0][..visibleCharacters]}***@{parts[1]}";
    }
}

public sealed class UnconfiguredSmsVerificationSender : ICustomerVerificationSender
{
    public VerificationChannel Channel => VerificationChannel.Phone;
    public bool IsConfigured => false;

    public Task SendAsync(
        string destination,
        string code,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken = default) =>
        throw new VerificationChannelUnavailableException();
}
