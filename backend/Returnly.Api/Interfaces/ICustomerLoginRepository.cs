using Returnly.Api.Entities;

namespace Returnly.Api.Interfaces;

public interface ICustomerLoginRepository
{
    Task<CustomerLoginChallenge?> GetChallengeAsync(
        Guid id, CancellationToken cancellationToken = default);
    Task<CustomerLoginChallenge?> GetLatestActiveAsync(
        string email, CancellationToken cancellationToken = default);
    Task<CustomerLoginChallenge?> GetBySelectionHashAsync(
        string hash, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Customer>> GetCustomersByEmailAsync(
        string email, CancellationToken cancellationToken = default);
    Task AddAsync(CustomerLoginChallenge challenge, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
