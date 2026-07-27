using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Returnly.Api.DTOs;
using Returnly.Api.Entities;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Returnly.Api.Configuration;

public sealed class CreateQrCodeRequestSchemaFilter : ISchemaFilter
{
    public void Apply(OpenApiSchema schema, SchemaFilterContext context)
    {
        if (context.Type != typeof(CreateQrCodeRequest))
        {
            return;
        }

        schema.Example = new OpenApiObject
        {
            ["name"] = new OpenApiString("Front Counter"),
            ["type"] = new OpenApiString(QrCodeType.General.ToString()),
            ["pointsPerScan"] = new OpenApiInteger(5),
            ["isActive"] = new OpenApiBoolean(true),
        };
    }
}
