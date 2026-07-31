using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Returnly.Api.Configuration;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Services;

public sealed class CustomerPortalTokenService(IOptions<JwtOptions> options)
    : ICustomerPortalTokenService
{
    public const string AuthenticationScheme = "CustomerPortal";
    public const string TokenPurpose = "customer_portal";
    public const string CookieName = "returnly_customer_session";
    private const int AccessHours = 24;
    private readonly JwtOptions _options = options.Value;

    public GeneratedCustomerPortalToken Generate(Customer customer)
    {
        var issuedAt = DateTimeOffset.UtcNow;
        var expiresAt = issuedAt.AddHours(AccessHours);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, customer.Id.ToString()),
            new Claim("customer_id", customer.Id.ToString()),
            new Claim("restaurant_id", customer.RestaurantId.ToString()),
            new Claim("token_purpose", TokenPurpose),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(DeriveSigningKey(_options.Secret)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: CustomerIssuer(_options.Issuer),
            audience: CustomerAudience(_options.Audience),
            claims: claims,
            notBefore: issuedAt.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return new GeneratedCustomerPortalToken(
            new JwtSecurityTokenHandler().WriteToken(token),
            expiresAt);
    }

    public static byte[] DeriveSigningKey(string secret) =>
        SHA256.HashData(Encoding.UTF8.GetBytes($"{secret}|returnly-customer-portal"));

    public static string CustomerIssuer(string issuer) => $"{issuer}.CustomerPortal";
    public static string CustomerAudience(string audience) => $"{audience}.CustomerPortal";
}
