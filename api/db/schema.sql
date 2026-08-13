IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE TABLE [Datasets] (
        [Id] int NOT NULL IDENTITY,
        [RefId] uniqueidentifier NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_Datasets] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE TABLE [Folders] (
        [Id] int NOT NULL IDENTITY,
        [RefId] uniqueidentifier NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [ParentFolderId] int NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Folders] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Folders_Folders_ParentFolderId] FOREIGN KEY ([ParentFolderId]) REFERENCES [Folders] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE TABLE [DatasetColumns] (
        [Id] int NOT NULL IDENTITY,
        [RefId] uniqueidentifier NOT NULL,
        [DatasetId] int NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [Type] nvarchar(max) NOT NULL,
        [Order] int NOT NULL,
        [ConfigurationJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_DatasetColumns] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DatasetColumns_Datasets_DatasetId] FOREIGN KEY ([DatasetId]) REFERENCES [Datasets] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE TABLE [DatasetRows] (
        [Id] int NOT NULL IDENTITY,
        [RefId] uniqueidentifier NOT NULL,
        [DatasetId] int NOT NULL,
        CONSTRAINT [PK_DatasetRows] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DatasetRows_Datasets_DatasetId] FOREIGN KEY ([DatasetId]) REFERENCES [Datasets] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE TABLE [Reports] (
        [Id] int NOT NULL IDENTITY,
        [RefId] uniqueidentifier NOT NULL,
        [Number] int NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [FolderId] int NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Reports] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Reports_Folders_FolderId] FOREIGN KEY ([FolderId]) REFERENCES [Folders] ([Id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE TABLE [DatasetCells] (
        [Id] int NOT NULL IDENTITY,
        [RowId] int NOT NULL,
        [ColumnId] int NOT NULL,
        [StringValue] nvarchar(450) NULL,
        [NumberValue] float NULL,
        [BoolValue] bit NULL,
        [DateValue] datetime2 NULL,
        CONSTRAINT [PK_DatasetCells] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DatasetCells_DatasetRows_RowId] FOREIGN KEY ([RowId]) REFERENCES [DatasetRows] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE TABLE [ReportRevisions] (
        [Id] int NOT NULL IDENTITY,
        [RefId] uniqueidentifier NOT NULL,
        [ReportId] int NOT NULL,
        [Kind] nvarchar(max) NOT NULL,
        [VersionNumber] int NULL,
        [Columns] int NOT NULL DEFAULT 12,
        [Rows] int NOT NULL DEFAULT 10,
        [CreatedAt] datetime2 NOT NULL,
        [PublishedAt] datetime2 NULL,
        [Notes] nvarchar(max) NULL,
        [FiltersJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_ReportRevisions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ReportRevisions_Reports_ReportId] FOREIGN KEY ([ReportId]) REFERENCES [Reports] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE TABLE [Widgets] (
        [Id] int NOT NULL IDENTITY,
        [RefId] uniqueidentifier NOT NULL,
        [ReportRevisionId] int NOT NULL,
        [Type] nvarchar(max) NOT NULL,
        [X] int NOT NULL,
        [Y] int NOT NULL,
        [W] int NOT NULL,
        [H] int NOT NULL,
        [ConfigJson] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_Widgets] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Widgets_ReportRevisions_ReportRevisionId] FOREIGN KEY ([ReportRevisionId]) REFERENCES [ReportRevisions] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_DatasetCells_ColumnId_DateValue] ON [DatasetCells] ([ColumnId], [DateValue]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_DatasetCells_ColumnId_NumberValue] ON [DatasetCells] ([ColumnId], [NumberValue]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_DatasetCells_ColumnId_StringValue] ON [DatasetCells] ([ColumnId], [StringValue]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DatasetCells_RowId_ColumnId] ON [DatasetCells] ([RowId], [ColumnId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_DatasetColumns_DatasetId] ON [DatasetColumns] ([DatasetId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DatasetColumns_RefId] ON [DatasetColumns] ([RefId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_DatasetRows_DatasetId] ON [DatasetRows] ([DatasetId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DatasetRows_RefId] ON [DatasetRows] ([RefId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Datasets_RefId] ON [Datasets] ([RefId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Folders_ParentFolderId] ON [Folders] ([ParentFolderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Folders_RefId] ON [Folders] ([RefId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ReportRevisions_RefId] ON [ReportRevisions] ([RefId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_ReportRevisions_ReportId] ON [ReportRevisions] ([ReportId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_Reports_FolderId] ON [Reports] ([FolderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Reports_Number] ON [Reports] ([Number]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Reports_RefId] ON [Reports] ([RefId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Widgets_ReportRevisionId_RefId] ON [Widgets] ([ReportRevisionId], [RefId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260813185917_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260813185917_InitialCreate', N'10.0.10');
END;

COMMIT;
GO

