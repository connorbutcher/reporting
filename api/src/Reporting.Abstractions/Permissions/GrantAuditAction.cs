namespace Reporting.Abstractions;

/// <summary>What changed about a securable's permissions, for the audit trail.</summary>
public enum GrantAuditAction
{
    GrantAdded,
    GrantUpdated,
    GrantRemoved,
    InheritanceEnabled,
    InheritanceDisabled
}
