using Returnly.Api.Entities;

namespace Returnly.Api.Interfaces;

public interface IJwtTokenService
{
    GeneratedToken Generate(User user);
}

public sealed record GeneratedToken(string Value, DateTimeOffset ExpiresAt);
