CREATE TABLE [dbo].[GrantAuditEntries] (
    [Id]            INT            IDENTITY (1, 1) NOT NULL,
    [SecurableType] NVARCHAR (450) NOT NULL,
    [SecurableId]   INT            NULL,
    [Action]        NVARCHAR (MAX) NOT NULL,
    [SubjectType]   NVARCHAR (MAX) NULL,
    [SubjectId]     INT            NULL,
    [OldLevel]      NVARCHAR (MAX) NULL,
    [NewLevel]      NVARCHAR (MAX) NULL,
    [ActorUserId]   INT            NOT NULL,
    [CreatedAt]     DATETIME2 (7)  NOT NULL,
    CONSTRAINT [PK_GrantAuditEntries] PRIMARY KEY CLUSTERED ([Id] ASC)
);


GO
CREATE NONCLUSTERED INDEX [IX_GrantAuditEntries_SecurableType_SecurableId_CreatedAt]
    ON [dbo].[GrantAuditEntries]([SecurableType] ASC, [SecurableId] ASC, [CreatedAt] ASC);
