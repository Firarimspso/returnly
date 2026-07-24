using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Returnly.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRestaurantAuthentication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "users",
                keyColumn: "Id",
                keyValue: new Guid("1be0ace2-2161-41c6-8334-01829a4ab101"),
                column: "PasswordHash",
                value: "$2y$12$sSxHWN7yLGI1iFuDwG7Que3FL6OBQSuVtS1.J4Vkx37v.ETeSVYrC");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "users",
                keyColumn: "Id",
                keyValue: new Guid("1be0ace2-2161-41c6-8334-01829a4ab101"),
                column: "PasswordHash",
                value: "AUTHENTICATION_NOT_CONFIGURED");
        }
    }
}
