using Reporting.Abstractions;

namespace Reporting.DAL.Permissions;

/// <summary>A subject's highest grant along a chain and the node it comes from.</summary>
internal sealed record EffectiveGrant(AccessLevel Level, ChainNode Source);
