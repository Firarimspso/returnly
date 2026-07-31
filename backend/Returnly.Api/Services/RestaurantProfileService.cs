using System.Text.Json;
using System.Globalization;
using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class RestaurantProfileService(IRestaurantProfileRepository repository)
    : IRestaurantProfileService
{
    private const int MaximumImageLength = 2_800_000;

    public async Task<RestaurantProfileDto?> GetAsync(
        Guid restaurantId,
        CancellationToken cancellationToken = default)
    {
        var restaurant = await repository.GetAsync(restaurantId, false, cancellationToken);
        return restaurant is null ? null : ToDto(restaurant);
    }

    public async Task<RestaurantProfileDto?> UpdateAsync(
        Guid restaurantId,
        UpdateRestaurantProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        ValidateImage(request.LogoUrl);
        ValidateImage(request.CoverImageUrl);
        ValidateBusinessHours(request.BusinessHours);

        var restaurant = await repository.GetAsync(restaurantId, true, cancellationToken);
        if (restaurant is null) return null;

        restaurant.Name = request.Name.Trim();
        restaurant.LogoUrl = Clean(request.LogoUrl);
        restaurant.CoverImageUrl = Clean(request.CoverImageUrl);
        restaurant.Description = Clean(request.Description);
        restaurant.PhoneNumber = Clean(request.Phone);
        restaurant.Email = request.Email.Trim().ToLowerInvariant();
        restaurant.Website = Clean(request.Website);
        restaurant.Address = Clean(request.Address);
        restaurant.BusinessHours = request.BusinessHours;
        restaurant.Instagram = Clean(request.Instagram);
        restaurant.Facebook = Clean(request.Facebook);
        restaurant.PrimaryBrandColor = request.PrimaryBrandColor.ToUpperInvariant();
        restaurant.UpdatedAt = DateTimeOffset.UtcNow;
        await repository.SaveChangesAsync(cancellationToken);
        return ToDto(restaurant);
    }

    private static void ValidateImage(string? value)
    {
        if (value is null) return;
        if (value.Length > MaximumImageLength
            || (!value.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase)
                && !Uri.TryCreate(value, UriKind.Absolute, out _)))
        {
            throw new InvalidRestaurantProfileException("Images must be valid image data or URLs under 2 MB.");
        }
    }

    private static void ValidateBusinessHours(string value)
    {
        try
        {
            using var document = JsonDocument.Parse(value);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
                throw new JsonException();

            foreach (var day in document.RootElement.EnumerateObject())
            {
                if (day.Value.ValueKind != JsonValueKind.Object)
                    throw new JsonException();
                var closed = day.Value.TryGetProperty("closed", out var closedValue)
                    && closedValue.ValueKind == JsonValueKind.True;
                if (closed) continue;

                if (!day.Value.TryGetProperty("open", out var openValue)
                    || !day.Value.TryGetProperty("close", out var closeValue)
                    || openValue.ValueKind != JsonValueKind.String
                    || closeValue.ValueKind != JsonValueKind.String
                    || !TimeOnly.TryParseExact(
                        openValue.GetString(), "HH:mm", CultureInfo.InvariantCulture,
                        DateTimeStyles.None, out var opening)
                    || !TimeOnly.TryParseExact(
                        closeValue.GetString(), "HH:mm", CultureInfo.InvariantCulture,
                        DateTimeStyles.None, out var closing)
                    || opening >= closing)
                {
                    throw new InvalidRestaurantProfileException(
                        $"{day.Name}: opening time must be before closing time.");
                }
            }
        }
        catch (JsonException)
        {
            throw new InvalidRestaurantProfileException("Business hours must be a valid JSON object.");
        }
    }

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static RestaurantProfileDto ToDto(Restaurant restaurant) => new(
        restaurant.Id, restaurant.Name, restaurant.LogoUrl, restaurant.CoverImageUrl,
        restaurant.Description, restaurant.PhoneNumber, restaurant.Email, restaurant.Website,
        restaurant.Address, restaurant.BusinessHours, restaurant.Instagram, restaurant.Facebook,
        restaurant.PrimaryBrandColor, restaurant.UpdatedAt);
}

public sealed class InvalidRestaurantProfileException(string message) : Exception(message);
