CREATE TABLE [dbo].[Widgets] (
    [Id]         INT              IDENTITY (1, 1) NOT NULL,
    [RefId]      UNIQUEIDENTIFIER NOT NULL,
    [TabId]      INT              NOT NULL,
    [Type]       NVARCHAR (MAX)   NOT NULL,
    [X]          INT              NOT NULL,
    [Y]          INT              NOT NULL,
    [W]          INT              NOT NULL,
    [H]          INT              NOT NULL,
    [ConfigJson] NVARCHAR (MAX)   NOT NULL,
    CONSTRAINT [PK_Widgets] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Widgets_Tabs_TabId] FOREIGN KEY ([TabId]) REFERENCES [dbo].[Tabs] ([Id]) ON DELETE CASCADE
);


GO
CREATE UNIQUE NONCLUSTERED INDEX [IX_Widgets_TabId_RefId]
    ON [dbo].[Widgets]([TabId] ASC, [RefId] ASC);

