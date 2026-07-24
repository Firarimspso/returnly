using System.Security.Claims;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class CurrentTenant(IHttpContextAccessor httpContextAccessor) : ICurrentTenant
{
    public Guid? RestaurantId
    {
        get
        {
            var value = httpContextAccessor.HttpContext?.User.FindFirstValue("restaurant_id");
            return Guid.TryParse(value, out var restaurantId) ? restaurantId : null;
        }
    }

    public bool IsResolved => RestaurantId.HasValue;
}
