using Returnly.Api.Entities;

namespace Returnly.Api.Interfaces;

public interface ICustomerPortalTokenService
{
    GeneratedCustomerPortalToken Generate(Customer customer);
}

public sealed record GeneratedCustomerPortalToken(string Value, DateTimeOffset ExpiresAt);
