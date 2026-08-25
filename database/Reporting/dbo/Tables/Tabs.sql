CREATE TABLE [dbo].[Tabs] (
    [Id]               INT              IDENTITY (1, 1) NOT NULL,
    [RefId]            UNIQUEIDENTIFIER NOT NULL,
    [ReportRevisionId] INT              NOT NULL,
    [Name]             NVARCHAR (MAX)   NOT NULL,
    [Order]            INT              NOT NULL,
    [Columns]          INT              DEFAULT ((48)) NOT NULL,
    [Rows]             INT              DEFAULT ((30)) NOT NULL,
    CONSTRAINT [PK_Tabs] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Tabs_ReportRevisions_ReportRevisionId] FOREIGN KEY ([ReportRevisionId]) REFERENCES [dbo].[ReportRevisions] ([Id]) ON DELETE CASCADE
);


GO
CREATE UNIQUE NONCLUSTERED INDEX [IX_Tabs_ReportRevisionId_RefId]
    ON [dbo].[Tabs]([ReportRevisionId] ASC, [RefId] ASC);

