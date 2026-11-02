---
name: ddd-patterns
description: Référence des patterns DDD tactiques et stratégiques du projet (agrégat, entité, value object, événement de domaine, repository, Result, service de domaine, ACL) avec leurs implémentations C# et TypeScript. À consulter avant de créer ou modifier du code du domaine ou des cas d'usage.
user-invocable: false
---

# Patterns DDD du projet

## Stratégique
- **Contexte délimité** = un dossier ou namespace par contexte dans chaque couche (`AcroFunJam.Domain/<Contexte>/`, `core/src/domain/<contexte>/`).
- Un contexte ne référence jamais les types internes d'un autre : il passe par des identifiants, des événements d'intégration ou une couche anti-corruption dans Infrastructure.
- La carte des contextes est dans `docs/domain/context-map.md` et le langage omniprésent dans `docs/domain/glossary.md`.

## Building blocks partagés (`AcroFunJam.Domain/Common`, `core/src/domain/common`)

### C#
```csharp
public abstract class Entity<TId> where TId : notnull
{
    public TId Id { get; }
    protected Entity(TId id) => Id = id;
    public override bool Equals(object? obj) => obj is Entity<TId> other && GetType() == other.GetType() && Id.Equals(other.Id);
    public override int GetHashCode() => Id.GetHashCode();
}

public abstract class AggregateRoot<TId> : Entity<TId> where TId : notnull
{
    private readonly List<IDomainEvent> _events = [];
    public IReadOnlyList<IDomainEvent> DomainEvents => _events;
    protected AggregateRoot(TId id) : base(id) { }
    protected void Raise(IDomainEvent @event) => _events.Add(@event);
    public void ClearDomainEvents() => _events.Clear();
}

public interface IDomainEvent { DateTimeOffset OccurredAt { get; } }

public sealed record Error(string Code, string Message);

public readonly record struct Result<T>
{
    public T? Value { get; }
    public Error? Error { get; }
    public bool IsSuccess => Error is null;
    private Result(T? value, Error? error) { Value = value; Error = error; }
    public static Result<T> Success(T value) => new(value, null);
    public static Result<T> Failure(Error error) => new(default, error);
    public static implicit operator Result<T>(Error error) => Failure(error);
}
```

Value object = `record` (ou `readonly record struct`) immuable, avec une factory qui valide :

```csharp
public sealed record Email
{
    public string Value { get; }
    private Email(string value) => Value = value;
    public static Result<Email> Create(string raw) =>
        string.IsNullOrWhiteSpace(raw) || !raw.Contains('@')
            ? new Error("email.invalid", "Adresse e-mail invalide")
            : Result<Email>.Success(new Email(raw.Trim().ToLowerInvariant()));
}

public readonly record struct SessionId(Guid Value) { public static SessionId New() => new(Guid.CreateVersion7()); }
```

Agrégat : constructeur privé, factory statique, comportements nommés selon le métier, pas de setter public.

```csharp
public sealed class Session : AggregateRoot<SessionId>
{
    private readonly List<ParticipantId> _participants = [];
    public Capacity Capacity { get; private set; }
    public IReadOnlyCollection<ParticipantId> Participants => _participants;

    private Session(SessionId id, Capacity capacity) : base(id) => Capacity = capacity;
    public static Session Plan(Capacity capacity) => new(SessionId.New(), capacity);

    public Result<Registration> Register(ParticipantId participant, DateTimeOffset now)
    {
        if (_participants.Count >= Capacity.Value) return SessionErrors.Full;
        _participants.Add(participant);
        Raise(new ParticipantRegistered(Id, participant, now));
        return Result<Registration>.Success(new Registration(Id, participant));
    }
}
```

### TypeScript (`front/packages/core`)
```ts
export type Result<T, E = DomainError> = { ok: true; value: T } | { ok: false; error: E };
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const fail = <E>(error: E): Result<never, E> => ({ ok: false, error });
export type DomainError = { code: string; message: string };

// Value object : type « brandé » + factory qui valide
export type Email = string & { readonly __brand: 'Email' };
export const Email = {
  create(raw: string): Result<Email> {
    const v = raw.trim().toLowerCase();
    return v.includes('@') ? ok(v as Email) : fail({ code: 'email.invalid', message: 'Adresse e-mail invalide' });
  },
};
```
Côté front, privilégier des fonctions pures et des objets immuables (`readonly`) plutôt que des classes mutables.

## Règles
1. **Invariants dans l'agrégat**, jamais dans un handler ou un endpoint.
2. **Petits agrégats**. Une commande modifie un seul agrégat ; les autres sont référencés par identifiant ; la cohérence entre agrégats passe par les événements de domaine (cohérence à terme).
3. **Pas de primitive obsession** : tout concept métier devient un value object (identifiants typés compris).
4. **Erreurs métier attendues** = `Result` + `Error` avec un code stable (`<contexte>.<règle>`). Les exceptions sont réservées aux bugs et aux pannes techniques.
5. Le temps et l'aléatoire sont injectés (`TimeProvider` / `now` en paramètre), jamais `DateTime.Now` dans le domaine.
6. **Repository** : un par agrégat racine. Interface dans Application (port), implémentation EF Core dans Infrastructure. Méthodes orientées métier (`GetById`, `Add`), pas de `IQueryable` exposé.
7. **Service de domaine** seulement pour une règle qui ne revient naturellement à aucun agrégat. Sans état.
8. **Événements de domaine** au passé, levés par l'agrégat et dispatchés après la sauvegarde (unit of work dans Infrastructure).
9. Lectures : les queries peuvent contourner le modèle de domaine et projeter directement en DTO (CQRS léger).
10. Pas d'attributs de persistance ou de sérialisation dans le domaine : le mapping EF se fait en configuration fluente dans Infrastructure.

## Tests du domaine
- Tester via les comportements publics : `session.Register(...)` puis vérifier le `Result`, l'état exposé et les `DomainEvents`.
- *Test data builders* : `ASession().WithCapacity(2).WithParticipants(2).Build()`.
- Aucun mock dans les tests du domaine.
