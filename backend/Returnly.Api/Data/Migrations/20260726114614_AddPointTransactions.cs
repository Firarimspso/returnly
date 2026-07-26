using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Returnly.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPointTransactions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "point_transactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Points = table.Column<int>(type: "integer", nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    BalanceAfter = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_point_transactions", x => x.Id);
                    table.CheckConstraint("CK_point_transactions_balance_after", "\"BalanceAfter\" >= 0");
                    table.CheckConstraint("CK_point_transactions_points", "\"Points\" > 0");
                    table.ForeignKey(
                        name: "FK_point_transactions_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_point_transactions_restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_point_transactions_CustomerId",
                table: "point_transactions",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_point_transactions_RestaurantId",
                table: "point_transactions",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "IX_point_transactions_RestaurantId_CreatedAt",
                table: "point_transactions",
                columns: new[] { "RestaurantId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_point_transactions_RestaurantId_CustomerId",
                table: "point_transactions",
                columns: new[] { "RestaurantId", "CustomerId" });

            migrationBuilder.CreateIndex(
                name: "IX_point_transactions_RestaurantId_Type",
                table: "point_transactions",
                columns: new[] { "RestaurantId", "Type" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "point_transactions");
        }
    }
}
