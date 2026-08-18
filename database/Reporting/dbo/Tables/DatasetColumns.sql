CREATE TABLE [dbo].[DatasetColumns] (
    [Id]                INT              IDENTITY (1, 1) NOT NULL,
    [RefId]             UNIQUEIDENTIFIER NOT NULL,
    [DatasetId]         INT              NOT NULL,
    [Name]              NVARCHAR (MAX)   NOT NULL,
    [Type]              NVARCHAR (MAX)   NOT NULL,
    [Order]             INT              NOT NULL,
    [ConfigurationJson] NVARCHAR (MAX)   NOT NULL,
    CONSTRAINT [PK_DatasetColumns] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_DatasetColumns_Datasets_DatasetId] FOREIGN KEY ([DatasetId]) REFERENCES [dbo].[Datasets] ([Id]) ON DELETE CASCADE
);


GO
CREATE UNIQUE NONCLUSTERED INDEX [IX_DatasetColumns_DatasetId_RefId]
    ON [dbo].[DatasetColumns]([DatasetId] ASC, [RefId] ASC);

