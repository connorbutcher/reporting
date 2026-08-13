CREATE TABLE [dbo].[Widgets] (
    [Id]               INT              IDENTITY (1, 1) NOT NULL,
    [RefId]            UNIQUEIDENTIFIER NOT NULL,
    [ReportRevisionId] INT              NOT NULL,
    [Type]             NVARCHAR (MAX)   NOT NULL,
    [X]                INT              NOT NULL,
    [Y]                INT              NOT NULL,
    [W]                INT              NOT NULL,
    [H]                INT              NOT NULL,
    [ConfigJson]       NVARCHAR (MAX)   NOT NULL,
    CONSTRAINT [PK_Widgets] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Widgets_ReportRevisions_ReportRevisionId] FOREIGN KEY ([ReportRevisionId]) REFERENCES [dbo].[ReportRevisions] ([Id]) ON DELETE CASCADE
);


GO
CREATE UNIQUE NONCLUSTERED INDEX [IX_Widgets_ReportRevisionId_RefId]
    ON [dbo].[Widgets]([ReportRevisionId] ASC, [RefId] ASC);

