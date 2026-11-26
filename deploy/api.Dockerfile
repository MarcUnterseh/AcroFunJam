# Images of the API and of its migrations (ADR 0040). Build context: the root of the repository.
#   docker build -f deploy/api.Dockerfile --target api .
#   docker build -f deploy/api.Dockerfile --target migrations .

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY global.json .editorconfig ./
COPY .config/ .config/
COPY api/Directory.Build.props api/Directory.Packages.props api/
COPY api/src/AcroFunJam.Domain/AcroFunJam.Domain.csproj api/src/AcroFunJam.Domain/
COPY api/src/AcroFunJam.Application/AcroFunJam.Application.csproj api/src/AcroFunJam.Application/
COPY api/src/AcroFunJam.Infrastructure/AcroFunJam.Infrastructure.csproj api/src/AcroFunJam.Infrastructure/
COPY api/src/AcroFunJam.Api/AcroFunJam.Api.csproj api/src/AcroFunJam.Api/
RUN dotnet restore api/src/AcroFunJam.Api/AcroFunJam.Api.csproj && dotnet tool restore
COPY api/src/ api/src/
RUN dotnet publish api/src/AcroFunJam.Api/AcroFunJam.Api.csproj -c Release --no-restore -o /out/api

FROM build AS bundle
# A self-contained executable: the image of the migrations needs no .NET runtime.
RUN dotnet restore api/src/AcroFunJam.Infrastructure/AcroFunJam.Infrastructure.csproj --runtime linux-x64 \
 && dotnet ef migrations bundle \
      --project api/src/AcroFunJam.Infrastructure --startup-project api/src/AcroFunJam.Infrastructure \
      --configuration Release --runtime linux-x64 --self-contained --output /out/efbundle

# Applies the pending migrations to the database named by MIGRATIONS_CONNECTION, then stops.
FROM mcr.microsoft.com/dotnet/runtime-deps:10.0 AS migrations
COPY --from=bundle /out/efbundle /efbundle
USER $APP_UID
ENTRYPOINT ["/bin/sh", "-c", "exec /efbundle --connection \"$MIGRATIONS_CONNECTION\""]

# The full Debian image, not the chiseled one: Magick.NET loads native libraries (ADR 0039).
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS api
# Npgsql looks for the Kerberos library when it starts, and logs an error without it.
RUN apt-get update && apt-get install -y --no-install-recommends libgssapi-krb5-2 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /out/api ./
USER $APP_UID
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "AcroFunJam.Api.dll"]
