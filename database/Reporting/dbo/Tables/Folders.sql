CREATE TABLE [dbo].[Folders] (
    [Id]             INT              IDENTITY (1, 1) NOT NULL,
    [RefId]          UNIQUEIDENTIFIER NOT NULL,
    [Name]           NVARCHAR (MAX)   NOT NULL,
    [ParentFolderId] INT              NULL,
    [CreatedAt]      DATETIME2 (7)    NOT NULL,
    [UpdatedAt]      DATETIME2 (7)    NOT NULL,
    CONSTRAINT [PK_Folders] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Folders_Folders_ParentFolderId] FOREIGN KEY ([ParentFolderId]) REFERENCES [dbo].[Folders] ([Id])
);


GO
CREATE NONCLUSTERED INDEX [IX_Folders_ParentFolderId]
    ON [dbo].[Folders]([ParentFolderId] ASC);


GO
CREATE UNIQUE NONCLUSTERED INDEX [IX_Folders_RefId]
    ON [dbo].[Folders]([RefId] ASC);

