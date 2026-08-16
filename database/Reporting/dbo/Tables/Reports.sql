CREATE TABLE [dbo].[Reports] (
    [Id]        INT              IDENTITY (1, 1) NOT NULL,
    [RefId]     UNIQUEIDENTIFIER NOT NULL,
    [Number]    INT              NOT NULL,
    [Name]      NVARCHAR (MAX)   NOT NULL,
    [FolderId]  INT              NULL,
    [InheritsPermissions] BIT    NOT NULL DEFAULT 1,
    [CreatedAt] DATETIME2 (7)    NOT NULL,
    [UpdatedAt] DATETIME2 (7)    NOT NULL,
    CONSTRAINT [PK_Reports] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Reports_Folders_FolderId] FOREIGN KEY ([FolderId]) REFERENCES [dbo].[Folders] ([Id])
);


GO
CREATE NONCLUSTERED INDEX [IX_Reports_FolderId]
    ON [dbo].[Reports]([FolderId] ASC);


GO
CREATE UNIQUE NONCLUSTERED INDEX [IX_Reports_Number]
    ON [dbo].[Reports]([Number] ASC);


GO
CREATE UNIQUE NONCLUSTERED INDEX [IX_Reports_RefId]
    ON [dbo].[Reports]([RefId] ASC);

