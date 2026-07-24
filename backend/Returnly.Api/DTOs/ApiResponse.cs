namespace Returnly.Api.DTOs;

public sealed record ApiResponse<T>(T Data, string? Message = null);
