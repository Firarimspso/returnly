using Returnly.Api.DTOs;

namespace Returnly.Api.Interfaces;

public interface IRestaurantProfileService
{
    Task<RestaurantProfileDto?> GetAsync(Guid restaurantId, CancellationToken cancellationToken = default);
    Task<RestaurantProfileDto?> UpdateAsync(Guid restaurantId, UpdateRestaurantProfileRequest request, CancellationToken cancellationToken = default);
}
