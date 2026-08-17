CREATE TABLE [dbo].[Users] (
    [Id]            INT              IDENTITY (1, 1) NOT NULL,
    [RefId]         UNIQUEIDENTIFIER NOT NULL,
    [Email]         NVARCHAR (450)   NOT NULL,
    [DisplayName]   NVARCHAR (MAX)   NOT NULL,
    [IsGlobalAdmin] BIT              NOT NULL,
    [CreatedAt]     DATETIME2 (7)    NOT NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([Id] ASC)
);


GO
CREATE UNIQUE NONCLUSTERED INDEX [IX_Users_Email]
    ON [dbo].[Users]([Email] ASC);


GO
CREATE UNIQUE NONCLUSTERED INDEX [IX_Users_RefId]
    ON [dbo].[Users]([RefId] ASC);
