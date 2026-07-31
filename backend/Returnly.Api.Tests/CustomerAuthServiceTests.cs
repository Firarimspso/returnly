using Microsoft.Extensions.Options;
using Returnly.Api.Configuration;
using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;
using Returnly.Api.Services;
using Xunit;

namespace Returnly.Api.Tests;

public sealed class CustomerAuthServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 7, 31, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task RequestCode_StoresOnlyHash_AndReturnsNeutralResponse()
    {
        var fixture = new Fixture();

        var response = await fixture.Service.RequestCodeAsync(fixture.Request);

        var challenge = Assert.Single(fixture.Repository.Challenges);
        Assert.NotEqual(fixture.Generator.LastCode, challenge.CodeHash);
        Assert.DoesNotContain(fixture.Generator.LastCode, challenge.CodeHash);
        Assert.DoesNotContain("customer", response.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("j••@example.com", response.MaskedDestination);
        Assert.Equal(Now.AddMinutes(10), response.ExpiresAt);
    }

    [Fact]
    public async Task VerifyCode_Succeeds_CreatesTenantCustomer_ConsumesCode_AndAwardsPoints()
    {
        var fixture = new Fixture();
        var challenge = await fixture.Service.RequestCodeAsync(fixture.Request);

        var result = await fixture.Service.VerifyCodeAsync(new VerifyCustomerCodeRequest
        {
            ChallengeId = challenge.ChallengeId,
            VerificationCode = fixture.Generator.LastCode,
        });

        var customer = Assert.Single(fixture.Repository.Customers);
        Assert.Equal(fixture.RestaurantId, customer.RestaurantId);
        Assert.Equal("jo@example.com", customer.Email);
        Assert.NotNull(fixture.Repository.Challenges.Single().ConsumedAt);
        Assert.Equal(10, result.PointsAwarded);
        Assert.Equal("customer-token", result.CustomerPortalToken);
        Assert.Equal(fixture.RestaurantId, fixture.ScanProcessor.LastRestaurantId);
    }

    [Fact]
    public async Task VerifyCode_RejectsExpiredChallenge()
    {
        var fixture = new Fixture();
        var challenge = await fixture.Service.RequestCodeAsync(fixture.Request);
        fixture.Clock.Advance(TimeSpan.FromMinutes(11));

        await Assert.ThrowsAsync<VerificationChallengeExpiredException>(() =>
            fixture.Service.VerifyCodeAsync(new VerifyCustomerCodeRequest
            {
                ChallengeId = challenge.ChallengeId,
                VerificationCode = fixture.Generator.LastCode,
            }));
    }

    [Fact]
    public async Task VerifyCode_LimitsIncorrectAttempts()
    {
        var fixture = new Fixture();
        var challenge = await fixture.Service.RequestCodeAsync(fixture.Request);

        for (var attempt = 1; attempt < 5; attempt++)
        {
            await Assert.ThrowsAsync<VerificationCodeInvalidException>(() =>
                fixture.Service.VerifyCodeAsync(new VerifyCustomerCodeRequest
                {
                    ChallengeId = challenge.ChallengeId,
                    VerificationCode = "000000",
                }));
        }

        await Assert.ThrowsAsync<VerificationAttemptsExceededException>(() =>
            fixture.Service.VerifyCodeAsync(new VerifyCustomerCodeRequest
            {
                ChallengeId = challenge.ChallengeId,
                VerificationCode = "000000",
            }));
        Assert.Equal(5, fixture.Repository.Challenges.Single().AttemptCount);
    }

    [Fact]
    public async Task VerifyCode_IsOneTimeUse()
    {
        var fixture = new Fixture();
        var challenge = await fixture.Service.RequestCodeAsync(fixture.Request);
        var request = new VerifyCustomerCodeRequest
        {
            ChallengeId = challenge.ChallengeId,
            VerificationCode = fixture.Generator.LastCode,
        };

        await fixture.Service.VerifyCodeAsync(request);

        await Assert.ThrowsAsync<VerificationChallengeConsumedException>(() =>
            fixture.Service.VerifyCodeAsync(request));
        Assert.Equal(1, fixture.ScanProcessor.CallCount);
    }

    [Fact]
    public async Task Resend_EnforcesCooldown_ThenRotatesCodeAndExpiration()
    {
        var fixture = new Fixture();
        var challenge = await fixture.Service.RequestCodeAsync(fixture.Request);
        var originalCode = fixture.Generator.LastCode;

        await Assert.ThrowsAsync<VerificationResendCooldownException>(() =>
            fixture.Service.ResendCodeAsync(new ResendCustomerCodeRequest(challenge.ChallengeId)));

        fixture.Clock.Advance(TimeSpan.FromSeconds(61));
        var response = await fixture.Service.ResendCodeAsync(
            new ResendCustomerCodeRequest(challenge.ChallengeId));

        Assert.NotEqual(originalCode, fixture.Generator.LastCode);
        Assert.Equal(1, fixture.Repository.Challenges.Single().ResendCount);
        Assert.Equal(fixture.Clock.GetUtcNow().AddMinutes(10), response.ExpiresAt);
    }

    [Fact]
    public async Task VerifyCode_DoesNotMatchCustomerFromAnotherRestaurant()
    {
        var fixture = new Fixture();
        fixture.Repository.Customers.Add(new Customer
        {
            RestaurantId = Guid.NewGuid(),
            FirstName = "Other",
            LastName = "Tenant",
            Email = "jo@example.com",
            PhoneNumber = string.Empty,
        });
        var challenge = await fixture.Service.RequestCodeAsync(fixture.Request);

        await fixture.Service.VerifyCodeAsync(new VerifyCustomerCodeRequest
        {
            ChallengeId = challenge.ChallengeId,
            VerificationCode = fixture.Generator.LastCode,
        });

        Assert.Equal(2, fixture.Repository.Customers.Count);
        Assert.Contains(
            fixture.Repository.Customers,
            customer => customer.RestaurantId == fixture.RestaurantId
                && customer.Email == "jo@example.com");
    }

    [Fact]
    public async Task RequestCode_DoesNotReserveConsumeOrAwardQrCode()
    {
        var fixture = new Fixture();

        await fixture.Service.RequestCodeAsync(fixture.Request);

        Assert.True(fixture.Repository.QrCode.IsActive);
        Assert.Null(fixture.Repository.QrCode.ExpiresAt);
        Assert.Equal(0, fixture.Repository.QrCode.TotalScans);
        Assert.Null(fixture.Repository.QrCode.LastScannedAt);
        Assert.Equal(0, fixture.ScanProcessor.CallCount);
        Assert.Null(fixture.Repository.Challenges.Single().ConsumedAt);
    }

    [Fact]
    public async Task IncorrectCode_DoesNotConsumeQr_AndCorrectCodeCanStillAwardPoints()
    {
        var fixture = new Fixture();
        var challenge = await fixture.Service.RequestCodeAsync(fixture.Request);

        await Assert.ThrowsAsync<VerificationCodeInvalidException>(() =>
            fixture.Service.VerifyCodeAsync(new VerifyCustomerCodeRequest
            {
                ChallengeId = challenge.ChallengeId,
                VerificationCode = "000000",
            }));

        Assert.Null(fixture.Repository.Challenges.Single().ConsumedAt);
        Assert.Equal(0, fixture.ScanProcessor.CallCount);

        await fixture.Service.VerifyCodeAsync(new VerifyCustomerCodeRequest
        {
            ChallengeId = challenge.ChallengeId,
            VerificationCode = fixture.Generator.LastCode,
        });

        Assert.NotNull(fixture.Repository.Challenges.Single().ConsumedAt);
        Assert.Equal(1, fixture.ScanProcessor.CallCount);
    }

    [Fact]
    public async Task ExpiredChallenge_DoesNotConsumeQr_AndNewChallengeCanAwardPoints()
    {
        var fixture = new Fixture();
        var expired = await fixture.Service.RequestCodeAsync(fixture.Request);
        fixture.Clock.Advance(TimeSpan.FromMinutes(11));

        await Assert.ThrowsAsync<VerificationChallengeExpiredException>(() =>
            fixture.Service.VerifyCodeAsync(new VerifyCustomerCodeRequest
            {
                ChallengeId = expired.ChallengeId,
                VerificationCode = fixture.Generator.LastCode,
            }));

        Assert.Null(fixture.Repository.Challenges.Single().ConsumedAt);
        Assert.Equal(0, fixture.ScanProcessor.CallCount);

        var replacement = await fixture.Service.RequestCodeAsync(fixture.Request);
        await fixture.Service.VerifyCodeAsync(new VerifyCustomerCodeRequest
        {
            ChallengeId = replacement.ChallengeId,
            VerificationCode = fixture.Generator.LastCode,
        });

        Assert.Equal(2, fixture.Repository.Challenges.Count);
        Assert.Equal(1, fixture.ScanProcessor.CallCount);
    }

    [Fact]
    public async Task FailedPointAward_DoesNotConsumeVerificationChallenge()
    {
        var fixture = new Fixture();
        var challenge = await fixture.Service.RequestCodeAsync(fixture.Request);
        fixture.ScanProcessor.Failure = new InvalidOperationException("Database write failed.");

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            fixture.Service.VerifyCodeAsync(new VerifyCustomerCodeRequest
            {
                ChallengeId = challenge.ChallengeId,
                VerificationCode = fixture.Generator.LastCode,
            }));

        Assert.Null(fixture.Repository.Challenges.Single().ConsumedAt);
    }

    private sealed class Fixture
    {
        public Guid RestaurantId { get; } = Guid.NewGuid();
        public TestClock Clock { get; } = new(Now);
        public FakeCustomerAuthRepository Repository { get; }
        public FakeCodeGenerator Generator { get; } = new();
        public FakeScanProcessor ScanProcessor { get; }
        public CustomerAuthService Service { get; }
        public RequestCustomerVerificationCode Request { get; }

        public Fixture()
        {
            Repository = new FakeCustomerAuthRepository(RestaurantId);
            ScanProcessor = new FakeScanProcessor(RestaurantId);
            var options = Options.Create(new CustomerAuthOptions
            {
                CodeHashSecret = "test-verification-secret-that-is-long-enough",
                CodeLifetimeMinutes = 10,
                ResendCooldownSeconds = 60,
                MaxAttempts = 5,
                MaxResends = 3,
                EmailEnabled = true,
            });
            Service = new CustomerAuthService(
                Repository,
                ScanProcessor,
                Generator,
                new HmacVerificationCodeHasher(options),
                [new FakeSender()],
                options,
                Clock);
            Request = new RequestCustomerVerificationCode
            {
                QrToken = "valid-token",
                Channel = VerificationChannel.Email,
                Identifier = "Jo@Example.com",
            };
        }
    }

    private sealed class TestClock(DateTimeOffset now) : TimeProvider
    {
        private DateTimeOffset _now = now;
        public override DateTimeOffset GetUtcNow() => _now;
        public void Advance(TimeSpan duration) => _now = _now.Add(duration);
    }

    private sealed class FakeCodeGenerator : IVerificationCodeGenerator
    {
        private int _next = 123456;
        public string LastCode { get; private set; } = string.Empty;
        public string Generate()
        {
            LastCode = (_next++).ToString("D6");
            return LastCode;
        }
    }

    private sealed class FakeSender : ICustomerVerificationSender
    {
        public VerificationChannel Channel => VerificationChannel.Email;
        public bool IsConfigured => true;
        public Task SendAsync(
            string destination,
            string code,
            DateTimeOffset expiresAt,
            CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class FakeCustomerAuthRepository(Guid restaurantId)
        : ICustomerAuthRepository
    {
        public QrCode QrCode { get; } = new()
        {
            Id = Guid.NewGuid(),
            RestaurantId = restaurantId,
            Name = "Counter",
            Token = "valid-token",
            PointsPerScan = 10,
            IsActive = true,
            Restaurant = new Restaurant
            {
                Id = restaurantId,
                Name = "Test Restaurant",
                Slug = "test",
                Email = "owner@example.com",
                IsActive = true,
            },
        };
        public List<CustomerVerificationChallenge> Challenges { get; } = [];
        public List<Customer> Customers { get; } = [];

        public Task<QrCode?> GetQrCodeAsync(
            string token,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(token == QrCode.Token ? QrCode : null);

        public Task<CustomerVerificationChallenge?> GetChallengeAsync(
            Guid challengeId,
            CancellationToken cancellationToken = default)
        {
            var challenge = Challenges.SingleOrDefault(item => item.Id == challengeId);
            if (challenge is not null)
            {
                challenge.QrCode = QrCode;
                challenge.Restaurant = QrCode.Restaurant;
            }
            return Task.FromResult(challenge);
        }

        public Task<CustomerVerificationChallenge?> GetLatestActiveChallengeAsync(
            Guid tenantId,
            Guid qrCodeId,
            string normalizedIdentifier,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Challenges
                .Where(item => item.RestaurantId == tenantId
                    && item.QrCodeId == qrCodeId
                    && item.NormalizedIdentifier == normalizedIdentifier
                    && item.ConsumedAt == null)
                .OrderByDescending(item => item.CreatedAt)
                .FirstOrDefault());

        public Task<Customer?> GetCustomerAsync(
            Guid tenantId,
            VerificationChannel channel,
            string normalizedIdentifier,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Customers.SingleOrDefault(customer =>
                customer.RestaurantId == tenantId
                && (channel == VerificationChannel.Email
                    ? customer.Email.Equals(normalizedIdentifier, StringComparison.OrdinalIgnoreCase)
                    : customer.PhoneNumber == normalizedIdentifier)));

        public Task AddChallengeAsync(
            CustomerVerificationChallenge challenge,
            CancellationToken cancellationToken = default)
        {
            Challenges.Add(challenge);
            return Task.CompletedTask;
        }

        public Task AddCustomerAsync(
            Customer customer,
            CancellationToken cancellationToken = default)
        {
            Customers.Add(customer);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
            Task.CompletedTask;

        public Task<TResult> ExecuteInTransactionAsync<TResult>(
            Func<CancellationToken, Task<TResult>> operation,
            CancellationToken cancellationToken = default) =>
            operation(cancellationToken);
    }

    private sealed class FakeScanProcessor(Guid restaurantId) : IQrCodeScanProcessor
    {
        public int CallCount { get; private set; }
        public Guid LastRestaurantId { get; private set; }
        public Exception? Failure { get; set; }

        public Task<PublicQrScanResultDto> ScanAuthenticatedPublicAsync(
            Guid tenantId,
            string token,
            Guid customerId,
            CancellationToken cancellationToken = default)
        {
            Assert.Equal(restaurantId, tenantId);
            CallCount++;
            LastRestaurantId = tenantId;
            if (Failure is not null)
            {
                return Task.FromException<PublicQrScanResultDto>(Failure);
            }
            return Task.FromResult(new PublicQrScanResultDto(
                "Test Restaurant",
                null,
                "#6952E8",
                "Jo",
                10,
                10,
                Now,
                "customer-token",
                Now.AddHours(24)));
        }

        public Task<QrCodeScanResultDto> ScanForCustomerAsync(
            Guid tenantId,
            string token,
            Guid customerId,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<PublicQrCodeDto> ValidatePublicAsync(
            string token,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<PublicQrScanResultDto> ScanPublicAsync(
            string token,
            string identifier,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();
    }
}
