using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Returnly.Api.Data;
using Returnly.Api.Interfaces;
using Returnly.Api.Repositories;
using Returnly.Api.Services;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace Returnly.Api.Configuration;

public static class ServiceCollectionExtensions
{
    public const string FrontendCorsPolicy = "ReturnlyFrontend";

    public static IServiceCollection AddApiServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? ["http://localhost:4200"];

        services.AddControllers()
            .AddJsonOptions(options =>
                options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
        services.AddHttpContextAccessor();
        services.AddEndpointsApiExplorer();
        services.AddRateLimiter(options =>
        {
            options.AddPolicy("PublicCustomerAuth", context =>
                RateLimitPartition.GetFixedWindowLimiter(
                    context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 30,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                        AutoReplenishment = true,
                    }));
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        });
        services.AddCors(options =>
        {
            options.AddPolicy(FrontendCorsPolicy, policy =>
                policy.WithOrigins(allowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials());
        });

        services.AddScoped<ICurrentTenant, CurrentTenant>();
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IRewardRepository, RewardRepository>();
        services.AddScoped<IRewardService, RewardService>();
        services.AddScoped<IPointTransactionRepository, PointTransactionRepository>();
        services.AddScoped<IPointTransactionService, PointTransactionService>();
        services.AddScoped<IDashboardAnalyticsRepository, DashboardAnalyticsRepository>();
        services.AddScoped<IDashboardAnalyticsService, DashboardAnalyticsService>();
        services.AddScoped<IQrCodeRepository, QrCodeRepository>();
        services.AddScoped<IQrCodeScanProcessor, QrCodeScanProcessor>();
        services.AddScoped<IQrCodeService, QrCodeService>();
        services.AddScoped<IPublicQrCodeService, PublicQrCodeService>();
        services.AddSingleton<ICustomerPortalTokenService, CustomerPortalTokenService>();
        services.AddScoped<ICustomerPortalRepository, CustomerPortalRepository>();
        services.AddScoped<ICustomerPortalService, CustomerPortalService>();
        services.AddScoped<IRestaurantProfileRepository, RestaurantProfileRepository>();
        services.AddScoped<IRestaurantProfileService, RestaurantProfileService>();
        services.AddOptions<CustomerAuthOptions>()
            .Bind(configuration.GetSection(CustomerAuthOptions.SectionName))
            .ValidateDataAnnotations()
            .Validate(
                options => !options.CodeHashSecret.StartsWith("CHANGE_ME", StringComparison.Ordinal),
                "CustomerAuth:CodeHashSecret must be supplied through environment configuration.")
            .ValidateOnStart();
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<IVerificationCodeGenerator, CryptographicVerificationCodeGenerator>();
        services.AddSingleton<IVerificationCodeHasher, HmacVerificationCodeHasher>();
        services.AddSingleton<ICustomerVerificationSender, DevelopmentEmailVerificationSender>();
        services.AddSingleton<ICustomerVerificationSender, UnconfiguredSmsVerificationSender>();
        services.AddScoped<ICustomerAuthRepository, CustomerAuthRepository>();
        services.AddScoped<ICustomerAuthService, CustomerAuthService>();
        services.AddScoped<ICustomerLoginRepository, CustomerLoginRepository>();
        services.AddScoped<ICustomerLoginService, CustomerLoginService>();
        return services;
    }

    public static IServiceCollection AddDatabase(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

        services.AddDbContext<ReturnlyDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
                npgsql.MigrationsAssembly(typeof(ReturnlyDbContext).Assembly.FullName)));
        return services;
    }

    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        var jwt = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
            ?? throw new InvalidOperationException("JWT configuration is missing.");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1),
                };
            })
            .AddJwtBearer(CustomerPortalTokenService.AuthenticationScheme, options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = CustomerPortalTokenService.CustomerIssuer(jwt.Issuer),
                    ValidateAudience = true,
                    ValidAudience = CustomerPortalTokenService.CustomerAudience(jwt.Audience),
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        CustomerPortalTokenService.DeriveSigningKey(jwt.Secret)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1),
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        if (string.IsNullOrWhiteSpace(context.Token)
                            && context.HttpContext.Request.Path.StartsWithSegments(
                                "/api/public",
                                StringComparison.OrdinalIgnoreCase)
                            && context.Request.Cookies.TryGetValue(
                                CustomerPortalTokenService.CookieName,
                                out var cookieToken))
                        {
                            context.Token = cookieToken;
                        }
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = context =>
                    {
                        var environment = context.HttpContext.RequestServices
                            .GetRequiredService<IHostEnvironment>();
                        if (environment.IsDevelopment())
                        {
                            var logger = context.HttpContext.RequestServices
                                .GetRequiredService<ILoggerFactory>()
                                .CreateLogger("CustomerSessionDiagnostics");
                            logger.LogWarning(
                                "[DEV CUSTOMER SESSION] JWT validation succeeded. Source={Source} Restaurant={RestaurantId} Customer={CustomerId}",
                                context.Request.Cookies.ContainsKey(CustomerPortalTokenService.CookieName)
                                    ? "HttpOnlyCookie"
                                    : "AuthorizationBearer",
                                context.Principal?.FindFirst("restaurant_id")?.Value,
                                context.Principal?.FindFirst("customer_id")?.Value);
                        }
                        return Task.CompletedTask;
                    },
                    OnAuthenticationFailed = context =>
                    {
                        var environment = context.HttpContext.RequestServices
                            .GetRequiredService<IHostEnvironment>();
                        if (environment.IsDevelopment())
                        {
                            var logger = context.HttpContext.RequestServices
                                .GetRequiredService<ILoggerFactory>()
                                .CreateLogger("CustomerSessionDiagnostics");
                            logger.LogWarning(
                                "[DEV CUSTOMER SESSION] JWT validation failed. CookiePresent={CookiePresent} BearerPresent={BearerPresent} Reason={Reason}",
                                context.Request.Cookies.ContainsKey(CustomerPortalTokenService.CookieName),
                                context.Request.Headers.Authorization.ToString().StartsWith(
                                    "Bearer ", StringComparison.OrdinalIgnoreCase),
                                context.Exception.GetType().Name);
                        }
                        return Task.CompletedTask;
                    },
                };
            });
        services.AddAuthorization();
        return services;
    }

    public static IServiceCollection AddApiDocumentation(this IServiceCollection services)
    {
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Returnly API",
                Version = "v1",
                Description = "Restaurant loyalty and rewards platform API.",
            });
            options.SchemaFilter<CreateQrCodeRequestSchemaFilter>();
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Paste the JWT token only. Do not include the 'Bearer ' prefix; Swagger adds it automatically.",
            });
            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
                    },
                    Array.Empty<string>()
                },
            });
        });
        return services;
    }
}
