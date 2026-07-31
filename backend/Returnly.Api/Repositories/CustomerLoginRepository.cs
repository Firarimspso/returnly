using Microsoft.EntityFrameworkCore;
using Returnly.Api.Data;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Repositories;

public sealed class CustomerLoginRepository(ReturnlyDbContext dbContext)
    : ICustomerLoginRepository
{
    public Task<CustomerLoginChallenge?> GetChallengeAsync(
        Guid id, CancellationToken cancellationToken = default) =>
        dbContext.CustomerLoginChallenges.FirstOrDefaultAsync(
            challenge => challenge.Id == id, cancellationToken);

    public Task<CustomerLoginChallenge?> GetLatestActiveAsync(
        string email, CancellationToken cancellationToken = default) =>
        dbContext.CustomerLoginChallenges
            .Where(challenge => challenge.NormalizedEmail == email
                && challenge.ConsumedAt == null)
            .OrderByDescending(challenge => challenge.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<CustomerLoginChallenge?> GetBySelectionHashAsync(
        string hash, CancellationToken cancellationToken = default) =>
        dbContext.CustomerLoginChallenges.FirstOrDefaultAsync(
            challenge => challenge.SelectionTokenHash == hash,
            cancellationToken);

    public async Task<IReadOnlyList<Customer>> GetCustomersByEmailAsync(
        string email, CancellationToken cancellationToken = default) =>
        await dbContext.Customers
            .AsNoTracking()
            .Include(customer => customer.Restaurant)
            .Where(customer => customer.Email.ToLower() == email
                && customer.Restaurant.IsActive
                && customer.Status != CustomerStatus.Inactive)
            .OrderBy(customer => customer.Restaurant.Name)
            .ToListAsync(cancellationToken);

    public Task AddAsync(
        CustomerLoginChallenge challenge,
        CancellationToken cancellationToken = default) =>
        dbContext.CustomerLoginChallenges.AddAsync(challenge, cancellationToken).AsTask();

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
