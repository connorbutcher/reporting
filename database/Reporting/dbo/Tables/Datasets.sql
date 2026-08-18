CREATE TABLE [dbo].[Datasets] (
    [Id]               INT            IDENTITY (1, 1) NOT NULL,
    [ReportRevisionId] INT            NOT NULL,
    [Name]             NVARCHAR (MAX) NOT NULL,
    CONSTRAINT [PK_Datasets] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Datasets_ReportRevisions_ReportRevisionId] FOREIGN KEY ([ReportRevisionId]) REFERENCES [dbo].[ReportRevisions] ([Id]) ON DELETE CASCADE
);


GO
CREATE NONCLUSTERED INDEX [IX_Datasets_ReportRevisionId]
    ON [dbo].[Datasets]([ReportRevisionId] ASC);
