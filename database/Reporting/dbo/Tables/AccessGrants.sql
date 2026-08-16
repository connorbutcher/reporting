CREATE TABLE [dbo].[AccessGrants] (
    [Id]              INT           IDENTITY (1, 1) NOT NULL,
    [SecurableType]   NVARCHAR (450) NOT NULL,
    [SecurableId]     INT           NULL,
    [SubjectType]     NVARCHAR (450) NOT NULL,
    [SubjectId]       INT           NULL,
    [Level]           NVARCHAR (MAX) NOT NULL,
    [CreatedAt]       DATETIME2 (7) NOT NULL,
    [CreatedByUserId] INT           NOT NULL,
    CONSTRAINT [PK_AccessGrants] PRIMARY KEY CLUSTERED ([Id] ASC)
);


GO
-- No filter, so SQL Server's NULLs-compared-equal semantics enforce a single canonical
-- grant per (securable, subject) even for the Root/Everyone cases where ids are null.
CREATE UNIQUE NONCLUSTERED INDEX [IX_AccessGrants_SecurableType_SecurableId_SubjectType_SubjectId]
    ON [dbo].[AccessGrants]([SecurableType] ASC, [SecurableId] ASC, [SubjectType] ASC, [SubjectId] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_AccessGrants_SubjectType_SubjectId]
    ON [dbo].[AccessGrants]([SubjectType] ASC, [SubjectId] ASC);
