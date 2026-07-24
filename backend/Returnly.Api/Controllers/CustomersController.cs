using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Returnly.Api.DTOs;
using Returnly.Api.Interfaces;
using Returnly.Api.Services;

namespace Returnly.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/customers")]
public sealed class CustomersController(ICustomerService customerService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<ApiResponse<PagedResponse<CustomerDto>>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<CustomerDto>>>> GetAll(
        [FromQuery] CustomerQueryParameters query,
        CancellationToken cancellationToken)
    {
        var customers = await customerService.GetPagedAsync(query, cancellationToken);
        return Ok(new ApiResponse<PagedResponse<CustomerDto>>(customers));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApiResponse<CustomerDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var customer = await customerService.GetByIdAsync(id, cancellationToken);
        return customer is null
            ? NotFound()
            : Ok(new ApiResponse<CustomerDto>(customer));
    }

    [HttpPost]
    [ProducesResponseType<ApiResponse<CustomerDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> Create(
        [FromBody] CreateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var customer = await customerService.CreateAsync(request, cancellationToken);
            return CreatedAtAction(
                nameof(GetById),
                new { id = customer.Id },
                new ApiResponse<CustomerDto>(customer, "Customer created."));
        }
        catch (CustomerEmailConflictException exception)
        {
            return ConflictProblem(exception.Message);
        }
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<ApiResponse<CustomerDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ApiResponse<CustomerDto>>> Update(
        Guid id,
        [FromBody] UpdateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var customer = await customerService.UpdateAsync(id, request, cancellationToken);
            return customer is null
                ? NotFound()
                : Ok(new ApiResponse<CustomerDto>(customer, "Customer updated."));
        }
        catch (CustomerEmailConflictException exception)
        {
            return ConflictProblem(exception.Message);
        }
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        return await customerService.DeleteAsync(id, cancellationToken)
            ? NoContent()
            : NotFound();
    }

    private ObjectResult ConflictProblem(string detail) =>
        Problem(
            statusCode: StatusCodes.Status409Conflict,
            title: "Customer already exists",
            detail: detail);
}
