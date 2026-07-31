using Microsoft.Extensions.Options;
using Returnly.Api.Configuration;
using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;
using Returnly.Api.Services;
using Xunit;

namespace Returnly.Api.Tests;

public sealed class CustomerLoginServiceTests
{
    [Fact]
    public async Task StandaloneLogin_IssuesPortalTokenWithoutPointsOrQrScan()
    {
        var fixture = new Fixture(1);
        var before = fixture.Repository.Customers[0].CurrentPoints;
        var challenge = await fixture.Service.RequestCodeAsync(new("member@example.com"));

        var result = await fixture.Service.VerifyCodeAsync(
            new(challenge.ChallengeId, fixture.Generator.Code));

        Assert.Equal(CustomerLoginResultStatus.Authenticated, result.Status);
        Assert.Equal("portal-token", result.CustomerPortalToken);
        Assert.Equal(before, fixture.Repository.Customers[0].CurrentPoints);
        Assert.Equal(0, fixture.Repository.QrScansCreated);
        Assert.Equal(0, fixture.Repository.PointTransactionsCreated);
    }

    [Fact]
    public async Task WrongAndExpiredCodesFailWithoutIssuingSession()
    {
        var fixture = new Fixture(1);
        var challenge = await fixture.Service.RequestCodeAsync(new("member@example.com"));
        await Assert.ThrowsAsync<VerificationCodeInvalidException>(() =>
            fixture.Service.VerifyCodeAsync(new(challenge.ChallengeId, "000000")));
        fixture.Clock.Advance(TimeSpan.FromMinutes(11));
        await Assert.ThrowsAsync<VerificationChallengeExpiredException>(() =>
            fixture.Service.VerifyCodeAsync(new(challenge.ChallengeId, fixture.Generator.Code)));
        Assert.Equal(0, fixture.TokenService.CallCount);
    }

    [Fact]
    public async Task MultipleRestaurantMembershipsRequireVerifiedSelection()
    {
        var fixture = new Fixture(2);
        var challenge = await fixture.Service.RequestCodeAsync(new("member@example.com"));
        var verified = await fixture.Service.VerifyCodeAsync(
            new(challenge.ChallengeId, fixture.Generator.Code));

        Assert.Equal(CustomerLoginResultStatus.SelectRestaurant, verified.Status);
        Assert.Equal(2, verified.Restaurants.Count);
        Assert.Null(verified.CustomerPortalToken);

        var selected = await fixture.Service.SelectRestaurantAsync(new(
            verified.SelectionToken!, verified.Restaurants[1].CustomerKey));
        Assert.Equal(CustomerLoginResultStatus.Authenticated, selected.Status);
        Assert.Equal(fixture.Repository.Customers[1].RestaurantId,
            fixture.TokenService.LastCustomer!.RestaurantId);
    }

    [Fact]
    public async Task SelectionCannotChooseCustomerOutsideVerifiedEmail()
    {
        var fixture = new Fixture(2);
        var challenge = await fixture.Service.RequestCodeAsync(new("member@example.com"));
        var verified = await fixture.Service.VerifyCodeAsync(
            new(challenge.ChallengeId, fixture.Generator.Code));

        await Assert.ThrowsAsync<VerificationChallengeNotFoundException>(() =>
            fixture.Service.SelectRestaurantAsync(new(
                verified.SelectionToken!, Guid.NewGuid().ToString("N"))));
        Assert.Equal(0, fixture.TokenService.CallCount);
    }

    [Fact]
    public async Task UnknownEmailIsRevealedOnlyAfterSuccessfulVerification()
    {
        var fixture = new Fixture(0);
        var challenge = await fixture.Service.RequestCodeAsync(new("unknown@example.com"));
        Assert.Contains("code has been sent", challenge.Message);

        var result = await fixture.Service.VerifyCodeAsync(
            new(challenge.ChallengeId, fixture.Generator.Code));
        Assert.Equal(CustomerLoginResultStatus.NoAccount, result.Status);
    }

    private sealed class Fixture
    {
        public TestTimeProvider Clock { get; } = new();
        public FakeGenerator Generator { get; } = new();
        public FakeLoginRepository Repository { get; }
        public FakePortalTokenService TokenService { get; } = new();
        public CustomerLoginService Service { get; }

        public Fixture(int memberships)
        {
            Repository = new FakeLoginRepository(memberships);
            var options = Options.Create(new CustomerAuthOptions
            {
                CodeHashSecret = "standalone-login-test-secret-long-enough",
                CodeLifetimeMinutes = 10,
                ResendCooldownSeconds = 60,
                MaxAttempts = 5,
                MaxResends = 3,
            });
            Service = new CustomerLoginService(
                Repository,
                Generator,
                new HmacVerificationCodeHasher(options),
                [new FakeSender()],
                TokenService,
                options,
                Clock);
        }
    }

    private sealed class TestTimeProvider : TimeProvider
    {
        private DateTimeOffset _now = new(2026, 7, 31, 12, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => _now;
        public void Advance(TimeSpan value) => _now = _now.Add(value);
    }

    private sealed class FakeGenerator : IVerificationCodeGenerator
    {
        public string Code { get; private set; } = "123456";
        public string Generate() => Code;
    }

    private sealed class FakeSender : ICustomerVerificationSender
    {
        public VerificationChannel Channel => VerificationChannel.Email;
        public bool IsConfigured => true;
        public Task SendAsync(string destination, string code, DateTimeOffset expiresAt,
            CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class FakePortalTokenService : ICustomerPortalTokenService
    {
        public int CallCount { get; private set; }
        public Customer? LastCustomer { get; private set; }
        public GeneratedCustomerPortalToken Generate(Customer customer)
        {
            CallCount++;
            LastCustomer = customer;
            return new("portal-token", DateTimeOffset.UtcNow.AddHours(24));
        }
    }

    private sealed class FakeLoginRepository : ICustomerLoginRepository
    {
        public List<CustomerLoginChallenge> Challenges { get; } = [];
        public List<Customer> Customers { get; } = [];
        public int QrScansCreated { get; } = 0;
        public int PointTransactionsCreated { get; } = 0;

        public FakeLoginRepository(int memberships)
        {
            for (var index = 0; index < memberships; index++)
            {
                var restaurant = new Restaurant
                {
                    Id = Guid.NewGuid(),
                    Name = $"Restaurant {index + 1}",
                    Slug = $"restaurant-{index + 1}",
                    Email = $"owner{index}@example.com",
                    IsActive = true,
                };
                Customers.Add(new Customer
                {
                    Id = Guid.NewGuid(),
                    RestaurantId = restaurant.Id,
                    Restaurant = restaurant,
                    FirstName = "Member",
                    LastName = "Customer",
                    Email = "member@example.com",
                    PhoneNumber = string.Empty,
                    CurrentPoints = 25 + index,
                });
            }
        }

        public Task<CustomerLoginChallenge?> GetChallengeAsync(Guid id,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Challenges.SingleOrDefault(item => item.Id == id));
        public Task<CustomerLoginChallenge?> GetLatestActiveAsync(string email,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Challenges.LastOrDefault(item => item.NormalizedEmail == email
                && item.ConsumedAt == null));
        public Task<CustomerLoginChallenge?> GetBySelectionHashAsync(string hash,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Challenges.SingleOrDefault(item => item.SelectionTokenHash == hash));
        public Task<IReadOnlyList<Customer>> GetCustomersByEmailAsync(string email,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Customer>>(Customers
                .Where(item => item.Email == email).ToArray());
        public Task AddAsync(CustomerLoginChallenge challenge,
            CancellationToken cancellationToken = default)
        {
            Challenges.Add(challenge);
            return Task.CompletedTask;
        }
        public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }
}
