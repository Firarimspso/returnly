using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using Returnly.Api.Controllers;
using Returnly.Api.DTOs;
using Returnly.Api.Interfaces;
using Returnly.Api.Services;
using Xunit;

namespace Returnly.Api.Tests;

public sealed class CustomerAuthControllerTests
{
    [Fact]
    public void Logout_ExpiresOnlyCustomerCookie_WithoutCallingBusinessServices()
    {
        var context = new DefaultHttpContext();
        var controller = new CustomerAuthController(
            null!,
            new TestEnvironment(),
            NullLogger<CustomerAuthController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = context },
        };

        var action = controller.Logout();

        var result = Assert.IsType<OkObjectResult>(action.Result);
        var response = Assert.IsType<ApiResponse<bool>>(result.Value);
        Assert.Equal("Customer session ended.", response.Message);
        var setCookie = Assert.Single(context.Response.Headers.SetCookie);
        Assert.Contains($"{CustomerPortalTokenService.CookieName}=", setCookie);
        Assert.Contains("path=/api/public", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("expires=", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", setCookie, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class TestEnvironment : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "Returnly.Api.Tests";
        public string WebRootPath { get; set; } = string.Empty;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
