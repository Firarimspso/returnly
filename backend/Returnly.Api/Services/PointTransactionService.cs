using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class PointTransactionService(
    IPointTransactionRepository pointTransactionRepository,
    ICurrentTenant currentTenant) : IPointTransactionService
{
    public async Task<PagedResponse<PointTransactionDto>> GetPagedAsync(
        PointTransactionQueryParameters query,
        CancellationToken cancellationToken = default)
    {
        var (items, totalCount) = await pointTransactionRepository.GetPagedAsync(
            GetRestaurantId(),
            query.Page,
            query.PageSize,
            query.CustomerId,
            query.Type,
            query.Search,
            cancellationToken);
        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)query.PageSize);

        return new PagedResponse<PointTransactionDto>(
            items.Select(ToDto).ToArray(),
            query.Page,
            query.PageSize,
            totalCount,
            totalPages);
    }

    public async Task<PointTransactionDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var transaction = await pointTransactionRepository.GetByIdAsync(
            GetRestaurantId(), id, cancellationToken);
        return transaction is null ? null : ToDto(transaction);
    }

    public Task<PointTransactionDto> EarnAsync(
        CreatePointTransactionRequest request,
        CancellationToken cancellationToken = default) =>
        CreateAsync(request, PointTransactionType.Earn, cancellationToken);

    public Task<PointTransactionDto> RedeemAsync(
        CreatePointTransactionRequest request,
        CancellationToken cancellationToken = default) =>
        CreateAsync(request, PointTransactionType.Redeem, cancellationToken);

    private async Task<PointTransactionDto> CreateAsync(
        CreatePointTransactionRequest request,
        PointTransactionType type,
        CancellationToken cancellationToken)
    {
        var restaurantId = GetRestaurantId();
        var customer = await pointTransactionRepository.GetCustomerAsync(
            restaurantId, request.CustomerId, cancellationToken);
        if (customer is null)
        {
            throw new PointTransactionCustomerNotFoundException();
        }

        if (type == PointTransactionType.Redeem && customer.CurrentPoints < request.Points)
        {
            throw new InsufficientCustomerPointsException(
                customer.CurrentPoints,
                request.Points);
        }

        if (type == PointTransactionType.Earn)
        {
            customer.CurrentPoints = checked(customer.CurrentPoints + request.Points);
            customer.LifetimePoints = checked(customer.LifetimePoints + request.Points);
        }
        else
        {
            customer.CurrentPoints -= request.Points;
        }

        var transaction = new PointTransaction
        {
            RestaurantId = restaurantId,
            CustomerId = customer.Id,
            Customer = customer,
            Points = request.Points,
            Type = type,
            Reason = request.Reason.Trim(),
            BalanceAfter = customer.CurrentPoints,
        };

        await pointTransactionRepository.AddAsync(transaction, cancellationToken);
        await pointTransactionRepository.SaveChangesAsync(cancellationToken);
        return ToDto(transaction);
    }

    private Guid GetRestaurantId() =>
        currentTenant.RestaurantId
        ?? throw new UnauthorizedAccessException("The token does not contain a restaurant_id claim.");

    private static PointTransactionDto ToDto(PointTransaction transaction) => new(
        transaction.Id,
        transaction.CustomerId,
        $"{transaction.Customer.FirstName} {transaction.Customer.LastName}",
        transaction.Points,
        transaction.Type,
        transaction.Reason,
        transaction.BalanceAfter,
        transaction.CreatedAt);
}

public sealed class PointTransactionCustomerNotFoundException : Exception
{
    public PointTransactionCustomerNotFoundException()
        : base("The customer was not found for the authenticated restaurant.")
    {
    }
}

public sealed class InsufficientCustomerPointsException(
    int currentPoints,
    int requestedPoints) : Exception(
        $"The customer has {currentPoints} points but {requestedPoints} points were requested.")
{
}
