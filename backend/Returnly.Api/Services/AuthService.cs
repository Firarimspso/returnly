using Returnly.Api.DTOs;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class AuthService(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    IJwtTokenService jwtTokenService) : IAuthService
{
    public async Task<LoginResponse?> LoginAsync(
        LoginRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetActiveByEmailAsync(request.Email, cancellationToken);
        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return null;
        }

        user.LastLoginAt = DateTimeOffset.UtcNow;
        await userRepository.SaveChangesAsync(cancellationToken);

        var token = jwtTokenService.Generate(user);
        var authenticatedUser = new AuthenticatedUserDto(
            user.Id,
            user.RestaurantId,
            user.FirstName,
            user.LastName,
            user.Email,
            user.Role.ToString(),
            user.Restaurant.Name);

        return new LoginResponse(token.Value, token.ExpiresAt, authenticatedUser);
    }
}
