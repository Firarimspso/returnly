using Returnly.Api.Entities;

namespace Returnly.Api.Interfaces;

public interface IVerificationCodeGenerator
{
    string Generate();
}

public interface IVerificationCodeHasher
{
    string Hash(Guid challengeId, string code);
    bool Verify(Guid challengeId, string code, string expectedHash);
}

public interface ICustomerVerificationSender
{
    VerificationChannel Channel { get; }
    bool IsConfigured { get; }
    Task SendAsync(
        string destination,
        string code,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken = default);
}
