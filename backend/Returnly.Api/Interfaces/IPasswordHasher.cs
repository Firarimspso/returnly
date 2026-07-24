namespace Returnly.Api.Interfaces;

public interface IPasswordHasher
{
    bool Verify(string password, string passwordHash);
}
