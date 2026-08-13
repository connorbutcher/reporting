CREATE TABLE [dbo].[Datasets] (
    [Id]    INT              IDENTITY (1, 1) NOT NULL,
    [RefId] UNIQUEIDENTIFIER NOT NULL,
    [Name]  NVARCHAR (MAX)   NOT NULL,
    CONSTRAINT [PK_Datasets] PRIMARY KEY CLUSTERED ([Id] ASC)
);


GO
CREATE UNIQUE NONCLUSTERED INDEX [IX_Datasets_RefId]
    ON [dbo].[Datasets]([RefId] ASC);

