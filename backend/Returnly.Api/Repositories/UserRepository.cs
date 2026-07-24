using Microsoft.EntityFrameworkCore;
using Returnly.Api.Data;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Repositories;

public sealed class UserRepository(ReturnlyDbContext dbContext) : IUserRepository
{
    public Task<User?> GetActiveByEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        return dbContext.Users
            .Include(user => user.Restaurant)
            .FirstOrDefaultAsync(
                user => user.IsActive
                    && user.Restaurant.IsActive
                    && user.Email.ToLower() == normalizedEmail,
                cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
