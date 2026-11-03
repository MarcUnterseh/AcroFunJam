using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CreateContributionPoseProposals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "contribution");

            migrationBuilder.CreateTable(
                name: "pose_proposals",
                schema: "contribution",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    contributor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    name_key = table.Column<string>(type: "text", nullable: false),
                    base_difficulty = table.Column<string>(type: "text", nullable: false),
                    flyer_difficulty = table.Column<string>(type: "text", nullable: false),
                    can_start_flow = table.Column<bool>(type: "boolean", nullable: false),
                    can_end_flow = table.Column<bool>(type: "boolean", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    submitted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    accepted_by = table.Column<Guid>(type: "uuid", nullable: true),
                    accepted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pose_proposals", x => x.id);
                    table.CheckConstraint("ck_pose_proposals_base_difficulty", "base_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("ck_pose_proposals_flyer_difficulty", "flyer_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("ck_pose_proposals_name_key", "name_key <> ''");
                    table.CheckConstraint("ck_pose_proposals_name_length", "char_length(name) <= 60");
                    table.CheckConstraint("ck_pose_proposals_status", "status IN ('pending', 'accepted')");
                });

            migrationBuilder.CreateIndex(
                name: "ix_pose_proposals_contributor_id",
                schema: "contribution",
                table: "pose_proposals",
                column: "contributor_id");

            migrationBuilder.CreateIndex(
                name: "ix_pose_proposals_pending_name_key",
                schema: "contribution",
                table: "pose_proposals",
                column: "name_key",
                unique: true,
                filter: "status = 'pending'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pose_proposals",
                schema: "contribution");
        }
    }
}
