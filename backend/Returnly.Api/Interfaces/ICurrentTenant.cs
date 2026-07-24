namespace Returnly.Api.Interfaces;

public interface ICurrentTenant
{
    Guid? RestaurantId { get; }
    bool IsResolved { get; }
}
