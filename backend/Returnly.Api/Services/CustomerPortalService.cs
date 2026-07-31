using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class CustomerPortalService(
    ICustomerPortalRepository repository,
    IHttpContextAccessor httpContextAccessor) : ICustomerPortalService
{
    private static readonly char[] CodeCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray();
    private static readonly TimeSpan RequestLifetime = TimeSpan.FromMinutes(10);

    public async Task<CustomerPortalDto> GetAsync(
        CancellationToken cancellationToken = default)
    {
        var (restaurantId, customerId) = GetCustomerContext();
        var customer = await repository.GetCustomerAsync(
            restaurantId, customerId, cancellationToken)
            ?? throw new CustomerPortalNotFoundException();
        var rewards = await repository.GetActiveRewardsAsync(
            restaurantId, cancellationToken);
        var transactions = await repository.GetTransactionsAsync(
            restaurantId, customerId, cancellationToken);
        var redemptions = await repository.GetRedemptionsAsync(
            restaurantId, customerId, cancellationToken);

        return new CustomerPortalDto(
            customer.Restaurant.Name,
            customer.Restaurant.LogoUrl,
            customer.Restaurant.CoverImageUrl,
            customer.Restaurant.Description,
            customer.Restaurant.PrimaryBrandColor,
            customer.FirstName,
            customer.CurrentPoints,
            rewards.Select(reward => ToRewardDto(reward, customer.CurrentPoints)).ToArray(),
            transactions.Select(ToTransactionDto).ToArray(),
            redemptions.Select(ToRedemptionDto).ToArray());
    }

    public async Task<PagedResponse<AdminRedemptionRequestDto>> GetAdminRedemptionsAsync(
        Guid restaurantId,
        RedemptionRequestQueryParameters query,
        CancellationToken cancellationToken = default)
    {
        var (items, totalCount) = await repository.GetAdminRedemptionsAsync(
            restaurantId,
            query.Page,
            query.PageSize,
            query.Search,
            query.Status,
            cancellationToken);
        var totalPages = (int)Math.Ceiling(totalCount / (double)query.PageSize);
        return new PagedResponse<AdminRedemptionRequestDto>(
            items.Select(ToAdminRedemptionDto).ToArray(),
            query.Page,
            query.PageSize,
            totalCount,
            totalPages);
    }

    public async Task<RedemptionRequestDto> RequestRedemptionAsync(
        CreateRedemptionRequest request,
        CancellationToken cancellationToken = default)
    {
        var (restaurantId, customerId) = GetCustomerContext();
        var customer = await repository.GetCustomerAsync(
            restaurantId, customerId, cancellationToken)
            ?? throw new CustomerPortalNotFoundException();
        var reward = await repository.GetRewardAsync(
            restaurantId, request.RewardId, cancellationToken)
            ?? throw new CustomerPortalRewardNotFoundException();
        if (customer.CurrentPoints < reward.RequiredPoints)
        {
            throw new CustomerPortalInsufficientPointsException();
        }

        var existing = await repository.GetPendingRequestAsync(
            restaurantId, customerId, reward.Id, cancellationToken);
        if (existing is not null)
        {
            return ToRequestDto(existing);
        }

        var redemptionRequest = new RedemptionRequest
        {
            RestaurantId = restaurantId,
            CustomerId = customerId,
            RewardId = reward.Id,
            Reward = reward,
            ConfirmationCode = await GenerateCodeAsync(cancellationToken),
            ExpiresAt = DateTimeOffset.UtcNow.Add(RequestLifetime),
        };
        await repository.AddRequestAsync(redemptionRequest, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);
        return ToRequestDto(redemptionRequest);
    }

    public async Task<ConfirmedRedemptionDto> ConfirmAsync(
        Guid restaurantId,
        Guid userId,
        ConfirmRedemptionRequest request,
        CancellationToken cancellationToken = default)
    {
        var code = request.ConfirmationCode.Trim().ToUpperInvariant();
        var redemption = await repository.GetByCodeAsync(
            restaurantId, code, cancellationToken)
            ?? throw new RedemptionConfirmationNotFoundException();
        if (redemption.Status != RedemptionRequestStatus.Pending)
        {
            throw new RedemptionAlreadyProcessedException();
        }
        if (redemption.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            redemption.Status = RedemptionRequestStatus.Expired;
            await repository.SaveChangesAsync(cancellationToken);
            throw new RedemptionRequestExpiredException();
        }
        if (redemption.Customer.CurrentPoints < redemption.Reward.RequiredPoints)
        {
            throw new CustomerPortalInsufficientPointsException();
        }

        var confirmedAt = DateTimeOffset.UtcNow;
        redemption.Customer.CurrentPoints -= redemption.Reward.RequiredPoints;
        redemption.Customer.RewardsRedeemed = checked(redemption.Customer.RewardsRedeemed + 1);
        redemption.Reward.TotalRedemptions = checked(redemption.Reward.TotalRedemptions + 1);
        redemption.Status = RedemptionRequestStatus.Confirmed;
        redemption.ConfirmedAt = confirmedAt;
        redemption.ConfirmedByUserId = userId;

        var transaction = new PointTransaction
        {
            RestaurantId = restaurantId,
            CustomerId = redemption.CustomerId,
            Customer = redemption.Customer,
            Points = redemption.Reward.RequiredPoints,
            Type = PointTransactionType.Redeem,
            Reason = $"Redeemed {redemption.Reward.Name}",
            BalanceAfter = redemption.Customer.CurrentPoints,
            CreatedAt = confirmedAt,
        };
        await repository.AddTransactionAsync(transaction, cancellationToken);
        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new RedemptionAlreadyProcessedException();
        }

        return new ConfirmedRedemptionDto(
            redemption.Id,
            redemption.CustomerId,
            $"{redemption.Customer.FirstName} {redemption.Customer.LastName}",
            redemption.RewardId,
            redemption.Reward.Name,
            redemption.Reward.RequiredPoints,
            redemption.Customer.CurrentPoints,
            confirmedAt);
    }

    private (Guid RestaurantId, Guid CustomerId) GetCustomerContext()
    {
        var user = httpContextAccessor.HttpContext?.User;
        var restaurantValue = user?.FindFirstValue("restaurant_id");
        var customerValue = user?.FindFirstValue("customer_id");
        var purpose = user?.FindFirstValue("token_purpose");
        if (purpose != CustomerPortalTokenService.TokenPurpose
            || !Guid.TryParse(restaurantValue, out var restaurantId)
            || !Guid.TryParse(customerValue, out var customerId))
        {
            throw new UnauthorizedAccessException("The customer portal token is invalid.");
        }
        return (restaurantId, customerId);
    }

    private async Task<string> GenerateCodeAsync(CancellationToken cancellationToken)
    {
        string code;
        do
        {
            code = new string(
                Enumerable.Range(0, 8)
                    .Select(_ => CodeCharacters[
                        RandomNumberGenerator.GetInt32(CodeCharacters.Length)])
                    .ToArray());
        }
        while (await repository.CodeExistsAsync(code, cancellationToken));
        return code;
    }

    private static CustomerPortalRewardDto ToRewardDto(Reward reward, int points)
    {
        var progress = reward.RequiredPoints == 0
            ? 100m
            : Math.Min(100m, Math.Round(points * 100m / reward.RequiredPoints, 1));
        return new CustomerPortalRewardDto(
            reward.Id,
            reward.Name,
            reward.Description,
            reward.RequiredPoints,
            reward.Icon,
            reward.Color,
            points >= reward.RequiredPoints,
            Math.Max(0, reward.RequiredPoints - points),
            progress);
    }

    private static CustomerPortalTransactionDto ToTransactionDto(PointTransaction transaction) =>
        new(
            transaction.Id,
            transaction.Type,
            transaction.Points,
            transaction.Reason,
            transaction.BalanceAfter,
            transaction.CreatedAt);

    private static CustomerPortalRedemptionDto ToRedemptionDto(RedemptionRequest request) =>
        new(
            request.Id,
            request.Reward.Name,
            request.Reward.RequiredPoints,
            request.Status == RedemptionRequestStatus.Pending
                && request.ExpiresAt <= DateTimeOffset.UtcNow
                    ? RedemptionRequestStatus.Expired
                    : request.Status,
            request.CreatedAt,
            request.ConfirmedAt);

    private static RedemptionRequestDto ToRequestDto(RedemptionRequest request) =>
        new(
            request.Id,
            request.RewardId,
            request.Reward.Name,
            request.Reward.RequiredPoints,
            request.ConfirmationCode,
            request.Status,
            request.ExpiresAt);

    private static AdminRedemptionRequestDto ToAdminRedemptionDto(RedemptionRequest request) =>
        new(
            request.Id,
            request.CustomerId,
            $"{request.Customer.FirstName} {request.Customer.LastName}",
            request.Customer.Email,
            request.RewardId,
            request.Reward.Name,
            request.Reward.RequiredPoints,
            request.ConfirmationCode,
            request.Status == RedemptionRequestStatus.Pending
                && request.ExpiresAt <= DateTimeOffset.UtcNow
                    ? RedemptionRequestStatus.Expired
                    : request.Status,
            request.CreatedAt,
            request.ExpiresAt,
            request.ConfirmedAt);
}

public sealed class CustomerPortalNotFoundException : Exception;
public sealed class CustomerPortalRewardNotFoundException : Exception;
public sealed class CustomerPortalInsufficientPointsException : Exception;
public sealed class RedemptionConfirmationNotFoundException : Exception;
public sealed class RedemptionAlreadyProcessedException : Exception;
public sealed class RedemptionRequestExpiredException : Exception;
