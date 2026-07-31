using Microsoft.EntityFrameworkCore;
using Returnly.Api.Data;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Repositories;

public sealed class CustomerAuthRepository(ReturnlyDbContext dbContext)
    : ICustomerAuthRepository
{
    public Task<QrCode?> GetQrCodeAsync(
        string token,
        CancellationToken cancellationToken = default) =>
        dbContext.QrCodes
            .Include(qrCode => qrCode.Restaurant)
            .FirstOrDefaultAsync(qrCode => qrCode.Token == token, cancellationToken);

    public Task<CustomerVerificationChallenge?> GetChallengeAsync(
        Guid challengeId,
        CancellationToken cancellationToken = default) =>
        dbContext.CustomerVerificationChallenges
            .Include(challenge => challenge.QrCode)
            .ThenInclude(qrCode => qrCode.Restaurant)
            .FirstOrDefaultAsync(challenge => challenge.Id == challengeId, cancellationToken);

    public Task<CustomerVerificationChallenge?> GetLatestActiveChallengeAsync(
        Guid restaurantId,
        Guid qrCodeId,
        string normalizedIdentifier,
        CancellationToken cancellationToken = default) =>
        dbContext.CustomerVerificationChallenges
            .Where(challenge => challenge.RestaurantId == restaurantId
                && challenge.QrCodeId == qrCodeId
                && challenge.NormalizedIdentifier == normalizedIdentifier
                && challenge.ConsumedAt == null)
            .OrderByDescending(challenge => challenge.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<Customer?> GetCustomerAsync(
        Guid restaurantId,
        VerificationChannel channel,
        string normalizedIdentifier,
        CancellationToken cancellationToken = default) =>
        channel == VerificationChannel.Email
            ? dbContext.Customers.FirstOrDefaultAsync(
                customer => customer.RestaurantId == restaurantId
                    && customer.Email.ToLower() == normalizedIdentifier,
                cancellationToken)
            : dbContext.Customers.FirstOrDefaultAsync(
                customer => customer.RestaurantId == restaurantId
                    && customer.PhoneNumber == normalizedIdentifier,
                cancellationToken);

    public Task AddChallengeAsync(
        CustomerVerificationChallenge challenge,
        CancellationToken cancellationToken = default) =>
        dbContext.CustomerVerificationChallenges.AddAsync(challenge, cancellationToken).AsTask();

    public Task AddCustomerAsync(
        Customer customer,
        CancellationToken cancellationToken = default) =>
        dbContext.Customers.AddAsync(customer, cancellationToken).AsTask();

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);

    public async Task<TResult> ExecuteInTransactionAsync<TResult>(
        Func<CancellationToken, Task<TResult>> operation,
        CancellationToken cancellationToken = default)
    {
        await using var transaction =
            await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var result = await operation(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return result;
    }
}
