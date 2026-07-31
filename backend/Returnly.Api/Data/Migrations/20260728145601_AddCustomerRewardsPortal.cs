using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Returnly.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerRewardsPortal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "redemption_requests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    RewardId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConfirmationCode = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ConfirmedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ConfirmedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_redemption_requests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_redemption_requests_customers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "customers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_redemption_requests_restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_redemption_requests_rewards_RewardId",
                        column: x => x.RewardId,
                        principalTable: "rewards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_redemption_requests_users_ConfirmedByUserId",
                        column: x => x.ConfirmedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_redemption_requests_ConfirmationCode",
                table: "redemption_requests",
                column: "ConfirmationCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_redemption_requests_ConfirmedByUserId",
                table: "redemption_requests",
                column: "ConfirmedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_redemption_requests_CustomerId",
                table: "redemption_requests",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_redemption_requests_RestaurantId_CustomerId_CreatedAt",
                table: "redemption_requests",
                columns: new[] { "RestaurantId", "CustomerId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_redemption_requests_RestaurantId_Status_ExpiresAt",
                table: "redemption_requests",
                columns: new[] { "RestaurantId", "Status", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_redemption_requests_RewardId",
                table: "redemption_requests",
                column: "RewardId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "redemption_requests");
        }
    }
}
