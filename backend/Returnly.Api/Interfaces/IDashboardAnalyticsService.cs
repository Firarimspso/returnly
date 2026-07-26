using Returnly.Api.DTOs;

namespace Returnly.Api.Interfaces;

public interface IDashboardAnalyticsService
{
    Task<DashboardAnalyticsDto> GetAsync(CancellationToken cancellationToken = default);
}
