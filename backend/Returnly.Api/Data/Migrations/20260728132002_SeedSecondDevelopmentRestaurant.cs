using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Returnly.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class SeedSecondDevelopmentRestaurant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "restaurants",
                columns: new[] { "Id", "Address", "CreatedAt", "Currency", "Email", "IsActive", "Name", "PhoneNumber", "Slug", "TimeZone", "UpdatedAt" },
                values: new object[] { new Guid("8c0f7be8-6385-4b45-9161-d330092c7602"), "Mar Mikhael, Beirut, Lebanon", new DateTimeOffset(new DateTime(2026, 7, 24, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "USD", "hello@cedarplate.com", true, "Cedar & Plate", "+961 1 555 019", "cedar-plate", "Asia/Beirut", null });

            migrationBuilder.InsertData(
                table: "users",
                columns: new[] { "Id", "CreatedAt", "Email", "FirstName", "IsActive", "LastLoginAt", "LastName", "PasswordHash", "RestaurantId", "Role", "UpdatedAt" },
                values: new object[] { new Guid("67557f80-fd28-476d-99df-bd0cf87e52d5"), new DateTimeOffset(new DateTime(2026, 7, 24, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "admin@cedarplate.com", "Maya", true, null, "Haddad", "$2y$12$sSxHWN7yLGI1iFuDwG7Que3FL6OBQSuVtS1.J4Vkx37v.ETeSVYrC", new Guid("8c0f7be8-6385-4b45-9161-d330092c7602"), "Admin", null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "users",
                keyColumn: "Id",
                keyValue: new Guid("67557f80-fd28-476d-99df-bd0cf87e52d5"));

            migrationBuilder.DeleteData(
                table: "restaurants",
                keyColumn: "Id",
                keyValue: new Guid("8c0f7be8-6385-4b45-9161-d330092c7602"));
        }
    }
}
