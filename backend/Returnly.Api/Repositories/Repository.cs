using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Returnly.Api.Data;
using Returnly.Api.Entities;
using Returnly.Api.Interfaces;

namespace Returnly.Api.Repositories;

public class Repository<TEntity>(ReturnlyDbContext dbContext) : IRepository<TEntity>
    where TEntity : BaseEntity
{
    private readonly DbSet<TEntity> _entities = dbContext.Set<TEntity>();

    public IQueryable<TEntity> Query() => _entities.AsNoTracking();

    public Task<TEntity?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _entities.FirstOrDefaultAsync(entity => entity.Id == id, cancellationToken);

    public async Task<IReadOnlyList<TEntity>> ListAsync(
        Expression<Func<TEntity, bool>>? predicate = null,
        CancellationToken cancellationToken = default)
    {
        var query = _entities.AsNoTracking();
        return await (predicate is null ? query : query.Where(predicate)).ToListAsync(cancellationToken);
    }

    public Task AddAsync(TEntity entity, CancellationToken cancellationToken = default) =>
        _entities.AddAsync(entity, cancellationToken).AsTask();

    public void Update(TEntity entity) => _entities.Update(entity);
    public void Remove(TEntity entity) => _entities.Remove(entity);
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
