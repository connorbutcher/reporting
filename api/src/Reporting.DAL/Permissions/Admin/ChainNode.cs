using Reporting.Abstractions;

namespace Reporting.DAL.Permissions;

/// <summary>One securable in an inheritance chain, named so a grant's origin can be explained.</summary>
internal sealed record ChainNode(SecurableType Type, int? Id, string Name, bool Inherits);
