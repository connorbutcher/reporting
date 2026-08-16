CREATE TABLE [dbo].[UserGroups] (
    [Id]    INT              IDENTITY (1, 1) NOT NULL,
    [RefId] UNIQUEIDENTIFIER NOT NULL,
    [Name]  NVARCHAR (MAX)   NOT NULL,
    CONSTRAINT [PK_UserGroups] PRIMARY KEY CLUSTERED ([Id] ASC)
);


GO
CREATE UNIQUE NONCLUSTERED INDEX [IX_UserGroups_RefId]
    ON [dbo].[UserGroups]([RefId] ASC);
