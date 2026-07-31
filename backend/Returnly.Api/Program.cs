using Returnly.Api.Configuration;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddApiServices(builder.Configuration)
    .AddDatabase(builder.Configuration)
    .AddJwtAuthentication(builder.Configuration)
    .AddApiDocumentation();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Returnly API v1");
        options.DocumentTitle = "Returnly API";
    });
}

app.UseHttpsRedirection();
app.UseCors(ServiceCollectionExtensions.FrontendCorsPolicy);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

if (!string.Equals(
        Environment.GetEnvironmentVariable("RETURNLY_EF_DESIGN_TIME"),
        "true",
        StringComparison.OrdinalIgnoreCase))
{
    app.Run();
}

public partial class Program;
