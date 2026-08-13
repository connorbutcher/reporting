CREATE TABLE [dbo].[DatasetRows] (
    [Id]        INT              IDENTITY (1, 1) NOT NULL,
    [RefId]     UNIQUEIDENTIFIER NOT NULL,
    [DatasetId] INT              NOT NULL,
    CONSTRAINT [PK_DatasetRows] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_DatasetRows_Datasets_DatasetId] FOREIGN KEY ([DatasetId]) REFERENCES [dbo].[Datasets] ([Id]) ON DELETE CASCADE
);


GO
CREATE NONCLUSTERED INDEX [IX_DatasetRows_DatasetId]
    ON [dbo].[DatasetRows]([DatasetId] ASC);


GO
CREATE UNIQUE NONCLUSTERED INDEX [IX_DatasetRows_RefId]
    ON [dbo].[DatasetRows]([RefId] ASC);

