using Returnly.Api.Entities;

namespace Returnly.Api.Interfaces;

public interface IRestaurantProfileRepository
{
    Task<Restaurant?> GetAsync(Guid restaurantId, bool tracked, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
