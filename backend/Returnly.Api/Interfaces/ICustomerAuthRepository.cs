using Returnly.Api.Entities;

namespace Returnly.Api.Interfaces;

public interface ICustomerAuthRepository
{
    Task<QrCode?> GetQrCodeAsync(string token, CancellationToken cancellationToken = default);
    Task<CustomerVerificationChallenge?> GetChallengeAsync(
        Guid challengeId,
        CancellationToken cancellationToken = default);
    Task<CustomerVerificationChallenge?> GetLatestActiveChallengeAsync(
        Guid restaurantId,
        Guid qrCodeId,
        string normalizedIdentifier,
        CancellationToken cancellationToken = default);
    Task<Customer?> GetCustomerAsync(
        Guid restaurantId,
        VerificationChannel channel,
        string normalizedIdentifier,
        CancellationToken cancellationToken = default);
    Task AddChallengeAsync(
        CustomerVerificationChallenge challenge,
        CancellationToken cancellationToken = default);
    Task AddCustomerAsync(Customer customer, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<TResult> ExecuteInTransactionAsync<TResult>(
        Func<CancellationToken, Task<TResult>> operation,
        CancellationToken cancellationToken = default);
}
