using Returnly.Api.Entities;

namespace Returnly.Api.Interfaces;

public interface IUserRepository
{
    Task<User?> GetActiveByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
