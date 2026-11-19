namespace AcroFunJam.Domain.FlowGeneration;

/// <summary>The chance of a generation (G6): no seed, an adapter draws; the tests script the draws.</summary>
public interface IRandomSource
{
    /// <summary>An index drawn at random from 0 to <paramref name="count"/> − 1.</summary>
    int NextIndex(int count);
}
