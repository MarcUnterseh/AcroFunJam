using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPosePhotos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "pose_photos",
                schema: "catalog",
                columns: table => new
                {
                    pose_id = table.Column<Guid>(type: "uuid", nullable: false),
                    main_photo_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pose_photos", x => x.pose_id);
                    table.ForeignKey(
                        name: "fk_pose_photos_pose",
                        column: x => x.pose_id,
                        principalSchema: "catalog",
                        principalTable: "poses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "photos",
                schema: "catalog",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    pose_id = table.Column<Guid>(type: "uuid", nullable: false),
                    alt_text = table.Column<string>(type: "text", nullable: false),
                    credit = table.Column<string>(type: "text", nullable: false),
                    width = table.Column<int>(type: "integer", nullable: false),
                    height = table.Column<int>(type: "integer", nullable: false),
                    addition_rank = table.Column<int>(type: "integer", nullable: false),
                    added_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    rights_confirmed_by = table.Column<Guid>(type: "uuid", nullable: false),
                    rights_confirmed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_photos", x => x.id);
                    table.CheckConstraint("ck_photos_alt_text", "alt_text <> '' AND char_length(alt_text) <= 200");
                    table.CheckConstraint("ck_photos_credit", "credit <> '' AND char_length(credit) <= 100");
                    table.CheckConstraint("ck_photos_dimensions", "width > 0 AND height > 0");
                    table.ForeignKey(
                        name: "fk_photos_pose_photos",
                        column: x => x.pose_id,
                        principalSchema: "catalog",
                        principalTable: "pose_photos",
                        principalColumn: "pose_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_photos_pose_id",
                schema: "catalog",
                table: "photos",
                column: "pose_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "photos",
                schema: "catalog");

            migrationBuilder.DropTable(
                name: "pose_photos",
                schema: "catalog");
        }
    }
}
