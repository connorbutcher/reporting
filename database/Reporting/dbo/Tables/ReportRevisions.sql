CREATE TABLE [dbo].[ReportRevisions] (
    [Id]            INT              IDENTITY (1, 1) NOT NULL,
    [RefId]         UNIQUEIDENTIFIER NOT NULL,
    [ReportId]      INT              NOT NULL,
    [Kind]          NVARCHAR (MAX)   NOT NULL,
    [VersionNumber] INT              NULL,
    [CreatedAt]     DATETIME2 (7)    NOT NULL,
    [PublishedAt]   DATETIME2 (7)    NULL,
    [Notes]         NVARCHAR (MAX)   NULL,
    [FiltersJson]   NVARCHAR (MAX)   NOT NULL,
    CONSTRAINT [PK_ReportRevisions] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_ReportRevisions_Reports_ReportId] FOREIGN KEY ([ReportId]) REFERENCES [dbo].[Reports] ([Id]) ON DELETE CASCADE
);


GO
CREATE UNIQUE NONCLUSTERED INDEX [IX_ReportRevisions_RefId]
    ON [dbo].[ReportRevisions]([RefId] ASC);


GO
CREATE NONCLUSTERED INDEX [IX_ReportRevisions_ReportId]
    ON [dbo].[ReportRevisions]([ReportId] ASC);

