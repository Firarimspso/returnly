using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Returnly.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRestaurantProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BusinessHours",
                table: "restaurants",
                type: "jsonb",
                nullable: false,
                defaultValue: "{}");

            migrationBuilder.AddColumn<string>(
                name: "CoverImageUrl",
                table: "restaurants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "restaurants",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Facebook",
                table: "restaurants",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Instagram",
                table: "restaurants",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LogoUrl",
                table: "restaurants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrimaryBrandColor",
                table: "restaurants",
                type: "character varying(7)",
                maxLength: 7,
                nullable: false,
                defaultValue: "#6952E8");

            migrationBuilder.AddColumn<string>(
                name: "Website",
                table: "restaurants",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "restaurants",
                keyColumn: "Id",
                keyValue: new Guid("2d1b09d7-76ed-4af2-8ea1-3d2036837a01"),
                columns: new[] { "BusinessHours", "CoverImageUrl", "Description", "Facebook", "Instagram", "LogoUrl", "PrimaryBrandColor", "Website" },
                values: new object[] { "{}", null, null, null, null, null, "#6952E8", null });

            migrationBuilder.UpdateData(
                table: "restaurants",
                keyColumn: "Id",
                keyValue: new Guid("8c0f7be8-6385-4b45-9161-d330092c7602"),
                columns: new[] { "BusinessHours", "CoverImageUrl", "Description", "Facebook", "Instagram", "LogoUrl", "PrimaryBrandColor", "Website" },
                values: new object[] { "{}", null, null, null, null, null, "#6952E8", null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BusinessHours",
                table: "restaurants");

            migrationBuilder.DropColumn(
                name: "CoverImageUrl",
                table: "restaurants");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "restaurants");

            migrationBuilder.DropColumn(
                name: "Facebook",
                table: "restaurants");

            migrationBuilder.DropColumn(
                name: "Instagram",
                table: "restaurants");

            migrationBuilder.DropColumn(
                name: "LogoUrl",
                table: "restaurants");

            migrationBuilder.DropColumn(
                name: "PrimaryBrandColor",
                table: "restaurants");

            migrationBuilder.DropColumn(
                name: "Website",
                table: "restaurants");
        }
    }
}
