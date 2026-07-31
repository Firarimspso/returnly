using System.ComponentModel.DataAnnotations;
using Returnly.Api.DTOs;
using Xunit;

namespace Returnly.Api.Tests;

public sealed class CustomerAuthDtoValidationTests
{
    [Fact]
    public void TrustedCustomerScanRequest_RequiresQrToken()
    {
        var request = new TrustedCustomerScanRequest { QrToken = string.Empty };
        var results = new List<ValidationResult>();

        var isValid = Validator.TryValidateObject(
            request,
            new ValidationContext(request),
            results,
            validateAllProperties: true);

        Assert.False(isValid);
        Assert.Contains(results, result => result.MemberNames.Contains(nameof(TrustedCustomerScanRequest.QrToken)));
    }

    [Fact]
    public void TrustedCustomerScanRequest_RejectsQrTokenLongerThanMaximum()
    {
        var request = new TrustedCustomerScanRequest { QrToken = new string('a', 201) };
        var results = new List<ValidationResult>();

        var isValid = Validator.TryValidateObject(
            request,
            new ValidationContext(request),
            results,
            validateAllProperties: true);

        Assert.False(isValid);
        Assert.Contains(results, result => result.MemberNames.Contains(nameof(TrustedCustomerScanRequest.QrToken)));
    }

    [Fact]
    public void TrustedCustomerScanRequest_AcceptsValidQrToken()
    {
        var request = new TrustedCustomerScanRequest { QrToken = "valid-qr-token" };
        var results = new List<ValidationResult>();

        var isValid = Validator.TryValidateObject(
            request,
            new ValidationContext(request),
            results,
            validateAllProperties: true);

        Assert.True(isValid);
        Assert.Empty(results);
    }
}
