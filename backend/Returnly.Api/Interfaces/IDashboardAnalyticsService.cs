using Returnly.Api.DTOs;

namespace Returnly.Api.Interfaces;

public interface IDashboardAnalyticsService
{
    Task<DashboardAnalyticsDto> GetAsync(
        DashboardPeriod period,
        CancellationToken cancellationToken = default);
}
