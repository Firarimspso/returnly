using Microsoft.EntityFrameworkCore;
using Returnly.Api.Entities;

namespace Returnly.Api.Data;

public sealed class ReturnlyDbContext(DbContextOptions<ReturnlyDbContext> options) : DbContext(options)
{
    public DbSet<Restaurant> Restaurants => Set<Restaurant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Reward> Rewards => Set<Reward>();
    public DbSet<PointTransaction> PointTransactions => Set<PointTransaction>();
    public DbSet<QrCode> QrCodes => Set<QrCode>();
    public DbSet<QrCodeScan> QrCodeScans => Set<QrCodeScan>();
    public DbSet<RedemptionRequest> RedemptionRequests => Set<RedemptionRequest>();
    public DbSet<CustomerVerificationChallenge> CustomerVerificationChallenges =>
        Set<CustomerVerificationChallenge>();
    public DbSet<CustomerLoginChallenge> CustomerLoginChallenges =>
        Set<CustomerLoginChallenge>();

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var updatedEntries = ChangeTracker
            .Entries<BaseEntity>()
            .Where(entry => entry.State == EntityState.Modified);

        foreach (var entry in updatedEntries)
        {
            entry.Entity.UpdatedAt = DateTimeOffset.UtcNow;
        }

        return base.SaveChangesAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ReturnlyDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
