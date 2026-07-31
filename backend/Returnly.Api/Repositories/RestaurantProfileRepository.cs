using Microsoft.EntityFrameworkCore;
using Returnly.Api.Data;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Repositories;

public sealed class RestaurantProfileRepository(ReturnlyDbContext dbContext)
    : IRestaurantProfileRepository
{
    public Task<Restaurant?> GetAsync(
        Guid restaurantId,
        bool tracked,
        CancellationToken cancellationToken = default)
    {
        var query = tracked
            ? dbContext.Restaurants.AsQueryable()
            : dbContext.Restaurants.AsNoTracking();
        return query.FirstOrDefaultAsync(
            restaurant => restaurant.Id == restaurantId,
            cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
