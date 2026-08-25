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

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816160306_SparseCellValuesAndFilteredIndexes'
)
BEGIN
    DROP INDEX [IX_DatasetCells_ColumnId_DateValue] ON [DatasetCells];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816160306_SparseCellValuesAndFilteredIndexes'
)
BEGIN
    DROP INDEX [IX_DatasetCells_ColumnId_NumberValue] ON [DatasetCells];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816160306_SparseCellValuesAndFilteredIndexes'
)
BEGIN
    DROP INDEX [IX_DatasetCells_ColumnId_StringValue] ON [DatasetCells];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816160306_SparseCellValuesAndFilteredIndexes'
)
BEGIN
    ALTER TABLE [DatasetCells] ALTER COLUMN [NumberValue] float SPARSE NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816160306_SparseCellValuesAndFilteredIndexes'
)
BEGIN
    ALTER TABLE [DatasetCells] ALTER COLUMN [DateValue] datetime2(7) SPARSE NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816160306_SparseCellValuesAndFilteredIndexes'
)
BEGIN
    ALTER TABLE [DatasetCells] ALTER COLUMN [BoolValue] bit SPARSE NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816160306_SparseCellValuesAndFilteredIndexes'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_DatasetCells_ColumnId_DateValue] ON [DatasetCells] ([ColumnId], [DateValue]) WHERE [DateValue] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816160306_SparseCellValuesAndFilteredIndexes'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_DatasetCells_ColumnId_NumberValue] ON [DatasetCells] ([ColumnId], [NumberValue]) WHERE [NumberValue] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816160306_SparseCellValuesAndFilteredIndexes'
)
BEGIN
    EXEC(N'CREATE INDEX [IX_DatasetCells_ColumnId_StringValue] ON [DatasetCells] ([ColumnId], [StringValue]) WHERE [StringValue] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816160306_SparseCellValuesAndFilteredIndexes'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260816160306_SparseCellValuesAndFilteredIndexes', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816174855_PermissionsIdentityFoundation'
)
BEGIN
    ALTER TABLE [Reports] ADD [InheritsPermissions] bit NOT NULL DEFAULT CAST(1 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816174855_PermissionsIdentityFoundation'
)
BEGIN
    ALTER TABLE [Folders] ADD [InheritsPermissions] bit NOT NULL DEFAULT CAST(1 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816174855_PermissionsIdentityFoundation'
)
BEGIN
    CREATE TABLE [AccessGrants] (
        [Id] int NOT NULL IDENTITY,
        [SecurableType] nvarchar(450) NOT NULL,
        [SecurableId] int NULL,
        [SubjectType] nvarchar(450) NOT NULL,
        [SubjectId] int NULL,
        [Level] nvarchar(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedByUserId] int NOT NULL,
        CONSTRAINT [PK_AccessGrants] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816174855_PermissionsIdentityFoundation'
)
BEGIN
    CREATE TABLE [UserGroups] (
        [Id] int NOT NULL IDENTITY,
        [RefId] uniqueidentifier NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_UserGroups] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816174855_PermissionsIdentityFoundation'
)
BEGIN
    CREATE TABLE [Users] (
        [Id] int NOT NULL IDENTITY,
        [RefId] uniqueidentifier NOT NULL,
        [Email] nvarchar(450) NOT NULL,
        [DisplayName] nvarchar(max) NOT NULL,
        [IsGlobalAdmin] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816174855_PermissionsIdentityFoundation'
)
BEGIN
    CREATE TABLE [UserGroupMembers] (
        [UserGroupId] int NOT NULL,
        [UserId] int NOT NULL,
        CONSTRAINT [PK_UserGroupMembers] PRIMARY KEY ([UserGroupId], [UserId]),
        CONSTRAINT [FK_UserGroupMembers_UserGroups_UserGroupId] FOREIGN KEY ([UserGroupId]) REFERENCES [UserGroups] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_UserGroupMembers_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816174855_PermissionsIdentityFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AccessGrants_SecurableType_SecurableId_SubjectType_SubjectId] ON [AccessGrants] ([SecurableType], [SecurableId], [SubjectType], [SubjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816174855_PermissionsIdentityFoundation'
)
BEGIN
    CREATE INDEX [IX_AccessGrants_SubjectType_SubjectId] ON [AccessGrants] ([SubjectType], [SubjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816174855_PermissionsIdentityFoundation'
)
BEGIN
    CREATE INDEX [IX_UserGroupMembers_UserId] ON [UserGroupMembers] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816174855_PermissionsIdentityFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_UserGroups_RefId] ON [UserGroups] ([RefId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816174855_PermissionsIdentityFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_Email] ON [Users] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816174855_PermissionsIdentityFoundation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_RefId] ON [Users] ([RefId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816174855_PermissionsIdentityFoundation'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260816174855_PermissionsIdentityFoundation', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816213132_GrantAuditTrail'
)
BEGIN
    CREATE TABLE [GrantAuditEntries] (
        [Id] int NOT NULL IDENTITY,
        [SecurableType] nvarchar(450) NOT NULL,
        [SecurableId] int NULL,
        [Action] nvarchar(max) NOT NULL,
        [SubjectType] nvarchar(max) NULL,
        [SubjectId] int NULL,
        [OldLevel] nvarchar(max) NULL,
        [NewLevel] nvarchar(max) NULL,
        [ActorUserId] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_GrantAuditEntries] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816213132_GrantAuditTrail'
)
BEGIN
    CREATE INDEX [IX_GrantAuditEntries_SecurableType_SecurableId_CreatedAt] ON [GrantAuditEntries] ([SecurableType], [SecurableId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260816213132_GrantAuditTrail'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260816213132_GrantAuditTrail', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    DELETE FROM [DatasetCells];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    DELETE FROM [DatasetRows];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    DELETE FROM [DatasetColumns];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    DELETE FROM [Datasets];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    DROP INDEX [IX_Datasets_RefId] ON [Datasets];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    DROP INDEX [IX_DatasetRows_DatasetId] ON [DatasetRows];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    DROP INDEX [IX_DatasetRows_RefId] ON [DatasetRows];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    DROP INDEX [IX_DatasetColumns_DatasetId] ON [DatasetColumns];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    DROP INDEX [IX_DatasetColumns_RefId] ON [DatasetColumns];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    DECLARE @var nvarchar(max);
    SELECT @var = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Datasets]') AND [c].[name] = N'RefId');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [Datasets] DROP CONSTRAINT ' + @var + ';');
    ALTER TABLE [Datasets] DROP COLUMN [RefId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    ALTER TABLE [Datasets] ADD [ReportRevisionId] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    CREATE INDEX [IX_Datasets_ReportRevisionId] ON [Datasets] ([ReportRevisionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DatasetRows_DatasetId_RefId] ON [DatasetRows] ([DatasetId], [RefId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DatasetColumns_DatasetId_RefId] ON [DatasetColumns] ([DatasetId], [RefId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    ALTER TABLE [Datasets] ADD CONSTRAINT [FK_Datasets_ReportRevisions_ReportRevisionId] FOREIGN KEY ([ReportRevisionId]) REFERENCES [ReportRevisions] ([Id]) ON DELETE CASCADE;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818201256_RevisionScopedDatasets'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260818201256_RevisionScopedDatasets', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822110755_DatasetSources'
)
BEGIN
    CREATE TABLE [DatasetSources] (
        [Id] int NOT NULL,
        [Key] nvarchar(450) NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        CONSTRAINT [PK_DatasetSources] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822110755_DatasetSources'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Key', N'Name') AND [object_id] = OBJECT_ID(N'[DatasetSources]'))
        SET IDENTITY_INSERT [DatasetSources] ON;
    EXEC(N'INSERT INTO [DatasetSources] ([Id], [Key], [Name])
    VALUES (1, N''Assembly'', N''Assembly''),
    (2, N''Disassembly'', N''Disassembly''),
    (3, N''Specification'', N''Specification'')');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Key', N'Name') AND [object_id] = OBJECT_ID(N'[DatasetSources]'))
        SET IDENTITY_INSERT [DatasetSources] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822110755_DatasetSources'
)
BEGIN
    ALTER TABLE [Datasets] ADD [DatasetSourceId] int NOT NULL DEFAULT 3;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822110755_DatasetSources'
)
BEGIN
    ALTER TABLE [Datasets] ADD [SourceConfigJson] nvarchar(max) NOT NULL DEFAULT N'{}';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822110755_DatasetSources'
)
BEGIN
    CREATE INDEX [IX_Datasets_DatasetSourceId] ON [Datasets] ([DatasetSourceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822110755_DatasetSources'
)
BEGIN
    CREATE UNIQUE INDEX [IX_DatasetSources_Key] ON [DatasetSources] ([Key]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822110755_DatasetSources'
)
BEGIN
    ALTER TABLE [Datasets] ADD CONSTRAINT [FK_Datasets_DatasetSources_DatasetSourceId] FOREIGN KEY ([DatasetSourceId]) REFERENCES [DatasetSources] ([Id]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260822110755_DatasetSources'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260822110755_DatasetSources', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260825183103_ReportTabs'
)
BEGIN
    CREATE TABLE [Tabs] (
        [Id] int NOT NULL IDENTITY,
        [RefId] uniqueidentifier NOT NULL,
        [ReportRevisionId] int NOT NULL,
        [Name] nvarchar(max) NOT NULL,
        [Order] int NOT NULL,
        [Columns] int NOT NULL DEFAULT 48,
        [Rows] int NOT NULL DEFAULT 30,
        CONSTRAINT [PK_Tabs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Tabs_ReportRevisions_ReportRevisionId] FOREIGN KEY ([ReportRevisionId]) REFERENCES [ReportRevisions] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260825183103_ReportTabs'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Tabs_ReportRevisionId_RefId] ON [Tabs] ([ReportRevisionId], [RefId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260825183103_ReportTabs'
)
BEGIN
    INSERT INTO [Tabs] ([RefId], [ReportRevisionId], [Name], [Order], [Columns], [Rows]) SELECT NEWID(), [Id], N'Tab 1', 0, [Columns], [Rows] FROM [ReportRevisions];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260825183103_ReportTabs'
)
BEGIN
    ALTER TABLE [Widgets] ADD [TabId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260825183103_ReportTabs'
)
BEGIN
    UPDATE w SET w.[TabId] = t.[Id] FROM [Widgets] w INNER JOIN [Tabs] t ON t.[ReportRevisionId] = w.[ReportRevisionId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260825183103_ReportTabs'
)
BEGIN
    DECLARE @var1 nvarchar(max);
    SELECT @var1 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Widgets]') AND [c].[name] = N'TabId');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [Widgets] DROP CONSTRAINT ' + @var1 + ';');
    ALTER TABLE [Widgets] ALTER COLUMN [TabId] int NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260825183103_ReportTabs'
)
BEGIN
    ALTER TABLE [Widgets] DROP CONSTRAINT [FK_Widgets_ReportRevisions_ReportRevisionId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260825183103_ReportTabs'
)
BEGIN
    DROP INDEX [IX_Widgets_ReportRevisionId_RefId] ON [Widgets];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260825183103_ReportTabs'
)
BEGIN
    DECLARE @var2 nvarchar(max);
    SELECT @var2 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Widgets]') AND [c].[name] = N'ReportRevisionId');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [Widgets] DROP CONSTRAINT ' + @var2 + ';');
    ALTER TABLE [Widgets] DROP COLUMN [ReportRevisionId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260825183103_ReportTabs'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Widgets_TabId_RefId] ON [Widgets] ([TabId], [RefId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260825183103_ReportTabs'
)
BEGIN
    ALTER TABLE [Widgets] ADD CONSTRAINT [FK_Widgets_Tabs_TabId] FOREIGN KEY ([TabId]) REFERENCES [Tabs] ([Id]) ON DELETE CASCADE;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260825183103_ReportTabs'
)
BEGIN
    DECLARE @var3 nvarchar(max);
    SELECT @var3 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ReportRevisions]') AND [c].[name] = N'Columns');
    IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [ReportRevisions] DROP CONSTRAINT ' + @var3 + ';');
    ALTER TABLE [ReportRevisions] DROP COLUMN [Columns];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260825183103_ReportTabs'
)
BEGIN
    DECLARE @var4 nvarchar(max);
    SELECT @var4 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ReportRevisions]') AND [c].[name] = N'Rows');
    IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [ReportRevisions] DROP CONSTRAINT ' + @var4 + ';');
    ALTER TABLE [ReportRevisions] DROP COLUMN [Rows];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260825183103_ReportTabs'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260825183103_ReportTabs', N'10.0.10');
END;

COMMIT;
GO

