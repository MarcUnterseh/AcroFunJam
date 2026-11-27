using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTransitionVideos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "videos",
                schema: "catalog",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    transition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    caption = table.Column<string>(type: "text", nullable: false),
                    credit = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    width = table.Column<int>(type: "integer", nullable: false),
                    height = table.Column<int>(type: "integer", nullable: false),
                    duration_ms = table.Column<long>(type: "bigint", nullable: false),
                    preparation = table.Column<string>(type: "text", nullable: false),
                    addition_rank = table.Column<int>(type: "integer", nullable: false),
                    added_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    rights_confirmed_by = table.Column<Guid>(type: "uuid", nullable: false),
                    rights_confirmed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_videos", x => x.id);
                    table.CheckConstraint("ck_videos_caption", "caption <> '' AND char_length(caption) <= 100");
                    table.CheckConstraint("ck_videos_credit", "credit <> '' AND char_length(credit) <= 100");
                    table.CheckConstraint("ck_videos_description", "description IS NULL OR (description <> '' AND char_length(description) <= 300)");
                    table.CheckConstraint("ck_videos_dimensions", "width > 0 AND height > 0");
                    table.CheckConstraint("ck_videos_preparation", "preparation IN ('in-preparation', 'ready', 'failed')");
                    table.ForeignKey(
                        name: "fk_videos_transitions",
                        column: x => x.transition_id,
                        principalSchema: "catalog",
                        principalTable: "transitions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "video_preparation_jobs",
                schema: "catalog",
                columns: table => new
                {
                    video_id = table.Column<Guid>(type: "uuid", nullable: false),
                    transition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    enqueued_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    attempts = table.Column<int>(type: "integer", nullable: false),
                    lease_until = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_video_preparation_jobs", x => x.video_id);
                    table.ForeignKey(
                        name: "fk_video_preparation_jobs_videos",
                        column: x => x.video_id,
                        principalSchema: "catalog",
                        principalTable: "videos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_video_preparation_jobs_enqueued_at",
                schema: "catalog",
                table: "video_preparation_jobs",
                column: "enqueued_at");

            migrationBuilder.CreateIndex(
                name: "ix_videos_transition_id",
                schema: "catalog",
                table: "videos",
                column: "transition_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "video_preparation_jobs",
                schema: "catalog");

            migrationBuilder.DropTable(
                name: "videos",
                schema: "catalog");
        }
    }
}
