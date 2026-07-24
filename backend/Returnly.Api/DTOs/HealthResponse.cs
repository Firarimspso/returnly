namespace Returnly.Api.DTOs;

public sealed record HealthResponse(string Status, string Environment, DateTimeOffset Timestamp);
