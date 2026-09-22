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

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908184325_AdminUserManagement'
)
BEGIN
    CREATE TABLE [AppPermissionGrants] (
        [Id] int NOT NULL IDENTITY,
        [Permission] nvarchar(450) NOT NULL,
        [SubjectType] nvarchar(450) NOT NULL,
        [SubjectId] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedByUserId] int NOT NULL,
        CONSTRAINT [PK_AppPermissionGrants] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908184325_AdminUserManagement'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AppPermissionGrants_Permission_SubjectType_SubjectId] ON [AppPermissionGrants] ([Permission], [SubjectType], [SubjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908184325_AdminUserManagement'
)
BEGIN
    CREATE INDEX [IX_AppPermissionGrants_SubjectType_SubjectId] ON [AppPermissionGrants] ([SubjectType], [SubjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908184325_AdminUserManagement'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260908184325_AdminUserManagement', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    DROP INDEX [IX_AppPermissionGrants_Permission_SubjectType_SubjectId] ON [AppPermissionGrants];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    DROP INDEX [IX_AppPermissionGrants_SubjectType_SubjectId] ON [AppPermissionGrants];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    DROP INDEX [IX_AccessGrants_SecurableType_SecurableId_SubjectType_SubjectId] ON [AccessGrants];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    DROP INDEX [IX_AccessGrants_SubjectType_SubjectId] ON [AccessGrants];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    ALTER TABLE [AccessGrants] ADD [FolderId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    ALTER TABLE [AccessGrants] ADD [ReportId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    ALTER TABLE [AccessGrants] ADD [UserId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    ALTER TABLE [AccessGrants] ADD [UserGroupId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    ALTER TABLE [AppPermissionGrants] ADD [UserId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    ALTER TABLE [AppPermissionGrants] ADD [UserGroupId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN

                    UPDATE [AccessGrants] SET
                        [FolderId]    = CASE WHEN [SecurableType] = 'Folder' THEN [SecurableId] END,
                        [ReportId]    = CASE WHEN [SecurableType] = 'Report' THEN [SecurableId] END,
                        [UserId]      = CASE WHEN [SubjectType]   = 'User'   THEN [SubjectId]   END,
                        [UserGroupId] = CASE WHEN [SubjectType]   = 'Group'  THEN [SubjectId]   END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN

                    UPDATE [AppPermissionGrants] SET
                        [UserId]      = CASE WHEN [SubjectType] = 'User'  THEN [SubjectId] END,
                        [UserGroupId] = CASE WHEN [SubjectType] = 'Group' THEN [SubjectId] END;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN

                    DELETE FROM [AccessGrants] WHERE
                        ([UserId]      IS NOT NULL AND [UserId]      NOT IN (SELECT [Id] FROM [Users]))
                     OR ([UserGroupId] IS NOT NULL AND [UserGroupId] NOT IN (SELECT [Id] FROM [UserGroups]))
                     OR ([FolderId]    IS NOT NULL AND [FolderId]    NOT IN (SELECT [Id] FROM [Folders]))
                     OR ([ReportId]    IS NOT NULL AND [ReportId]    NOT IN (SELECT [Id] FROM [Reports]))
                     OR ([SecurableType] = 'Folder' AND [FolderId] IS NULL)
                     OR ([SecurableType] = 'Report' AND [ReportId] IS NULL)
                     OR ([SubjectType]   = 'User'   AND [UserId] IS NULL)
                     OR ([SubjectType]   = 'Group'  AND [UserGroupId] IS NULL);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN

                    DELETE FROM [AppPermissionGrants] WHERE
                        ([UserId]      IS NOT NULL AND [UserId]      NOT IN (SELECT [Id] FROM [Users]))
                     OR ([UserGroupId] IS NOT NULL AND [UserGroupId] NOT IN (SELECT [Id] FROM [UserGroups]))
                     OR ([SubjectType] = 'User'  AND [UserId] IS NULL)
                     OR ([SubjectType] = 'Group' AND [UserGroupId] IS NULL);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    DECLARE @var5 nvarchar(max);
    SELECT @var5 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AccessGrants]') AND [c].[name] = N'SecurableId');
    IF @var5 IS NOT NULL EXEC(N'ALTER TABLE [AccessGrants] DROP CONSTRAINT ' + @var5 + ';');
    ALTER TABLE [AccessGrants] DROP COLUMN [SecurableId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    DECLARE @var6 nvarchar(max);
    SELECT @var6 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AccessGrants]') AND [c].[name] = N'SubjectId');
    IF @var6 IS NOT NULL EXEC(N'ALTER TABLE [AccessGrants] DROP CONSTRAINT ' + @var6 + ';');
    ALTER TABLE [AccessGrants] DROP COLUMN [SubjectId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    DECLARE @var7 nvarchar(max);
    SELECT @var7 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AppPermissionGrants]') AND [c].[name] = N'SubjectId');
    IF @var7 IS NOT NULL EXEC(N'ALTER TABLE [AppPermissionGrants] DROP CONSTRAINT ' + @var7 + ';');
    ALTER TABLE [AppPermissionGrants] DROP COLUMN [SubjectId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AppPermissionGrants_Permission_SubjectType_UserId_UserGroupId] ON [AppPermissionGrants] ([Permission], [SubjectType], [UserId], [UserGroupId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    CREATE INDEX [IX_AppPermissionGrants_UserGroupId] ON [AppPermissionGrants] ([UserGroupId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    CREATE INDEX [IX_AppPermissionGrants_UserId] ON [AppPermissionGrants] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    EXEC(N'ALTER TABLE [AppPermissionGrants] ADD CONSTRAINT [CK_AppPermissionGrant_Subject] CHECK (([SubjectType] = ''User'' AND [UserId] IS NOT NULL AND [UserGroupId] IS NULL) OR ([SubjectType] = ''Group'' AND [UserGroupId] IS NOT NULL AND [UserId] IS NULL))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    CREATE INDEX [IX_AccessGrants_FolderId] ON [AccessGrants] ([FolderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    CREATE INDEX [IX_AccessGrants_ReportId] ON [AccessGrants] ([ReportId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    CREATE INDEX [IX_AccessGrants_UserGroupId] ON [AccessGrants] ([UserGroupId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    CREATE INDEX [IX_AccessGrants_UserId] ON [AccessGrants] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AccessGrants_SecurableType_FolderId_ReportId_SubjectType_UserId_UserGroupId] ON [AccessGrants] ([SecurableType], [FolderId], [ReportId], [SubjectType], [UserId], [UserGroupId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    EXEC(N'ALTER TABLE [AccessGrants] ADD CONSTRAINT [CK_AccessGrant_Securable] CHECK (([SecurableType] = ''Folder'' AND [FolderId] IS NOT NULL AND [ReportId] IS NULL) OR ([SecurableType] = ''Report'' AND [ReportId] IS NOT NULL AND [FolderId] IS NULL) OR ([SecurableType] = ''Root'' AND [FolderId] IS NULL AND [ReportId] IS NULL))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    EXEC(N'ALTER TABLE [AccessGrants] ADD CONSTRAINT [CK_AccessGrant_Subject] CHECK (([SubjectType] = ''User'' AND [UserId] IS NOT NULL AND [UserGroupId] IS NULL) OR ([SubjectType] = ''Group'' AND [UserGroupId] IS NOT NULL AND [UserId] IS NULL) OR ([SubjectType] = ''Everyone'' AND [UserId] IS NULL AND [UserGroupId] IS NULL))');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    ALTER TABLE [AccessGrants] ADD CONSTRAINT [FK_AccessGrants_Folders_FolderId] FOREIGN KEY ([FolderId]) REFERENCES [Folders] ([Id]) ON DELETE CASCADE;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    ALTER TABLE [AccessGrants] ADD CONSTRAINT [FK_AccessGrants_Reports_ReportId] FOREIGN KEY ([ReportId]) REFERENCES [Reports] ([Id]) ON DELETE CASCADE;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    ALTER TABLE [AccessGrants] ADD CONSTRAINT [FK_AccessGrants_UserGroups_UserGroupId] FOREIGN KEY ([UserGroupId]) REFERENCES [UserGroups] ([Id]) ON DELETE CASCADE;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    ALTER TABLE [AccessGrants] ADD CONSTRAINT [FK_AccessGrants_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    ALTER TABLE [AppPermissionGrants] ADD CONSTRAINT [FK_AppPermissionGrants_UserGroups_UserGroupId] FOREIGN KEY ([UserGroupId]) REFERENCES [UserGroups] ([Id]) ON DELETE CASCADE;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    ALTER TABLE [AppPermissionGrants] ADD CONSTRAINT [FK_AppPermissionGrants_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260908195038_GrantReferentialIntegrity'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260908195038_GrantReferentialIntegrity', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260909120000_GroupManagers'
)
BEGIN
    CREATE TABLE [UserGroupManagers] (
        [UserGroupId] int NOT NULL,
        [UserId] int NOT NULL,
        CONSTRAINT [PK_UserGroupManagers] PRIMARY KEY ([UserGroupId], [UserId]),
        CONSTRAINT [FK_UserGroupManagers_UserGroups_UserGroupId] FOREIGN KEY ([UserGroupId]) REFERENCES [UserGroups] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_UserGroupManagers_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260909120000_GroupManagers'
)
BEGIN
    CREATE INDEX [IX_UserGroupManagers_UserId] ON [UserGroupManagers] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260909120000_GroupManagers'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260909120000_GroupManagers', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260909193001_ReportPersonalization'
)
BEGIN
    CREATE TABLE [ReportFavorites] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [ReportId] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ReportFavorites] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ReportFavorites_Reports_ReportId] FOREIGN KEY ([ReportId]) REFERENCES [Reports] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ReportFavorites_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260909193001_ReportPersonalization'
)
BEGIN
    CREATE TABLE [ReportViews] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [ReportId] int NOT NULL,
        [ViewedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ReportViews] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ReportViews_Reports_ReportId] FOREIGN KEY ([ReportId]) REFERENCES [Reports] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ReportViews_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260909193001_ReportPersonalization'
)
BEGIN
    CREATE INDEX [IX_ReportFavorites_ReportId] ON [ReportFavorites] ([ReportId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260909193001_ReportPersonalization'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ReportFavorites_UserId_ReportId] ON [ReportFavorites] ([UserId], [ReportId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260909193001_ReportPersonalization'
)
BEGIN
    CREATE INDEX [IX_ReportViews_ReportId] ON [ReportViews] ([ReportId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260909193001_ReportPersonalization'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ReportViews_UserId_ReportId] ON [ReportViews] ([UserId], [ReportId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260909193001_ReportPersonalization'
)
BEGIN
    CREATE INDEX [IX_ReportViews_UserId_ViewedAt] ON [ReportViews] ([UserId], [ViewedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260909193001_ReportPersonalization'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260909193001_ReportPersonalization', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260913181858_RemoveGroupAppPermissionGrants'
)
BEGIN
    DELETE FROM [AppPermissionGrants] WHERE [SubjectType] = 'Group';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260913181858_RemoveGroupAppPermissionGrants'
)
BEGIN
    ALTER TABLE [AppPermissionGrants] DROP CONSTRAINT [FK_AppPermissionGrants_UserGroups_UserGroupId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260913181858_RemoveGroupAppPermissionGrants'
)
BEGIN
    DROP INDEX [IX_AppPermissionGrants_Permission_SubjectType_UserId_UserGroupId] ON [AppPermissionGrants];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260913181858_RemoveGroupAppPermissionGrants'
)
BEGIN
    DROP INDEX [IX_AppPermissionGrants_UserGroupId] ON [AppPermissionGrants];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260913181858_RemoveGroupAppPermissionGrants'
)
BEGIN
    ALTER TABLE [AppPermissionGrants] DROP CONSTRAINT [CK_AppPermissionGrant_Subject];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260913181858_RemoveGroupAppPermissionGrants'
)
BEGIN
    DECLARE @var8 nvarchar(max);
    SELECT @var8 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AppPermissionGrants]') AND [c].[name] = N'SubjectType');
    IF @var8 IS NOT NULL EXEC(N'ALTER TABLE [AppPermissionGrants] DROP CONSTRAINT ' + @var8 + ';');
    ALTER TABLE [AppPermissionGrants] DROP COLUMN [SubjectType];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260913181858_RemoveGroupAppPermissionGrants'
)
BEGIN
    DECLARE @var9 nvarchar(max);
    SELECT @var9 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AppPermissionGrants]') AND [c].[name] = N'UserGroupId');
    IF @var9 IS NOT NULL EXEC(N'ALTER TABLE [AppPermissionGrants] DROP CONSTRAINT ' + @var9 + ';');
    ALTER TABLE [AppPermissionGrants] DROP COLUMN [UserGroupId];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260913181858_RemoveGroupAppPermissionGrants'
)
BEGIN
    DROP INDEX [IX_AppPermissionGrants_UserId] ON [AppPermissionGrants];
    DECLARE @var10 nvarchar(max);
    SELECT @var10 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AppPermissionGrants]') AND [c].[name] = N'UserId');
    IF @var10 IS NOT NULL EXEC(N'ALTER TABLE [AppPermissionGrants] DROP CONSTRAINT ' + @var10 + ';');
    EXEC(N'UPDATE [AppPermissionGrants] SET [UserId] = 0 WHERE [UserId] IS NULL');
    ALTER TABLE [AppPermissionGrants] ALTER COLUMN [UserId] int NOT NULL;
    ALTER TABLE [AppPermissionGrants] ADD DEFAULT 0 FOR [UserId];
    CREATE INDEX [IX_AppPermissionGrants_UserId] ON [AppPermissionGrants] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260913181858_RemoveGroupAppPermissionGrants'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AppPermissionGrants_Permission_UserId] ON [AppPermissionGrants] ([Permission], [UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260913181858_RemoveGroupAppPermissionGrants'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260913181858_RemoveGroupAppPermissionGrants', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260918200323_FilterOperatorCatalogue'
)
BEGIN
    CREATE TABLE [FilterOperatorDefinitions] (
        [Id] int NOT NULL IDENTITY,
        [ColumnType] nvarchar(450) NOT NULL,
        [Operator] nvarchar(450) NOT NULL,
        [Label] nvarchar(max) NOT NULL,
        [OperandCount] int NOT NULL,
        [OperandKind] nvarchar(max) NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_FilterOperatorDefinitions] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260918200323_FilterOperatorCatalogue'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'ColumnType', N'Label', N'OperandCount', N'OperandKind', N'Operator', N'SortOrder') AND [object_id] = OBJECT_ID(N'[FilterOperatorDefinitions]'))
        SET IDENTITY_INSERT [FilterOperatorDefinitions] ON;
    EXEC(N'INSERT INTO [FilterOperatorDefinitions] ([Id], [ColumnType], [Label], [OperandCount], [OperandKind], [Operator], [SortOrder])
    VALUES (1, N''String'', N''is'', 1, N''Text'', N''Equals'', 0),
    (2, N''String'', N''is not'', 1, N''Text'', N''NotEquals'', 1),
    (3, N''String'', N''contains'', 1, N''Text'', N''Contains'', 2),
    (4, N''String'', N''does not contain'', 1, N''Text'', N''NotContains'', 3),
    (5, N''String'', N''starts with'', 1, N''Text'', N''StartsWith'', 4),
    (6, N''String'', N''ends with'', 1, N''Text'', N''EndsWith'', 5),
    (7, N''String'', N''is any of'', 1, N''List'', N''In'', 6),
    (8, N''String'', N''is empty'', 0, N''None'', N''IsEmpty'', 7),
    (9, N''String'', N''is not empty'', 0, N''None'', N''IsNotEmpty'', 8),
    (10, N''Int'', N''='', 1, N''Number'', N''Equals'', 0),
    (11, N''Int'', N''≠'', 1, N''Number'', N''NotEquals'', 1),
    (12, N''Int'', N''>'', 1, N''Number'', N''GreaterThan'', 2),
    (13, N''Int'', N''≥'', 1, N''Number'', N''GreaterThanOrEqual'', 3),
    (14, N''Int'', N''<'', 1, N''Number'', N''LessThan'', 4),
    (15, N''Int'', N''≤'', 1, N''Number'', N''LessThanOrEqual'', 5),
    (16, N''Int'', N''is between'', 2, N''Number'', N''Between'', 6),
    (17, N''Int'', N''is empty'', 0, N''None'', N''IsEmpty'', 7),
    (18, N''Int'', N''is not empty'', 0, N''None'', N''IsNotEmpty'', 8),
    (19, N''Int'', N''is in tolerance'', 0, N''None'', N''InTolerance'', 9),
    (20, N''Int'', N''needs concession'', 0, N''None'', N''NeedsConcession'', 10),
    (21, N''Int'', N''is out of tolerance'', 0, N''None'', N''OutOfTolerance'', 11),
    (22, N''Double'', N''='', 1, N''Number'', N''Equals'', 0),
    (23, N''Double'', N''≠'', 1, N''Number'', N''NotEquals'', 1),
    (24, N''Double'', N''>'', 1, N''Number'', N''GreaterThan'', 2),
    (25, N''Double'', N''≥'', 1, N''Number'', N''GreaterThanOrEqual'', 3),
    (26, N''Double'', N''<'', 1, N''Number'', N''LessThan'', 4),
    (27, N''Double'', N''≤'', 1, N''Number'', N''LessThanOrEqual'', 5),
    (28, N''Double'', N''is between'', 2, N''Number'', N''Between'', 6),
    (29, N''Double'', N''is empty'', 0, N''None'', N''IsEmpty'', 7),
    (30, N''Double'', N''is not empty'', 0, N''None'', N''IsNotEmpty'', 8),
    (31, N''Double'', N''is in tolerance'', 0, N''None'', N''InTolerance'', 9),
    (32, N''Double'', N''needs concession'', 0, N''None'', N''NeedsConcession'', 10),
    (33, N''Double'', N''is out of tolerance'', 0, N''None'', N''OutOfTolerance'', 11),
    (34, N''Bool'', N''is true'', 0, N''None'', N''IsTrue'', 0),
    (35, N''Bool'', N''is false'', 0, N''None'', N''IsFalse'', 1),
    (36, N''Bool'', N''is empty'', 0, N''None'', N''IsEmpty'', 2),
    (37, N''Bool'', N''is not empty'', 0, N''None'', N''IsNotEmpty'', 3),
    (38, N''DateTime'', N''is on'', 1, N''Date'', N''Equals'', 0),
    (39, N''DateTime'', N''is not on'', 1, N''Date'', N''NotEquals'', 1),
    (40, N''DateTime'', N''is after'', 1, N''Date'', N''GreaterThan'', 2),
    (41, N''DateTime'', N''is on or after'', 1, N''Date'', N''GreaterThanOrEqual'', 3),
    (42, N''DateTime'', N''is before'', 1, N''Date'', N''LessThan'', 4);
    INSERT INTO [FilterOperatorDefinitions] ([Id], [ColumnType], [Label], [OperandCount], [OperandKind], [Operator], [SortOrder])
    VALUES (43, N''DateTime'', N''is on or before'', 1, N''Date'', N''LessThanOrEqual'', 5),
    (44, N''DateTime'', N''is between'', 2, N''Date'', N''Between'', 6),
    (45, N''DateTime'', N''is in the last (days)'', 1, N''Number'', N''InLastDays'', 7),
    (46, N''DateTime'', N''is in the next (days)'', 1, N''Number'', N''InNextDays'', 8),
    (47, N''DateTime'', N''is empty'', 0, N''None'', N''IsEmpty'', 9),
    (48, N''DateTime'', N''is not empty'', 0, N''None'', N''IsNotEmpty'', 10)');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'ColumnType', N'Label', N'OperandCount', N'OperandKind', N'Operator', N'SortOrder') AND [object_id] = OBJECT_ID(N'[FilterOperatorDefinitions]'))
        SET IDENTITY_INSERT [FilterOperatorDefinitions] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260918200323_FilterOperatorCatalogue'
)
BEGIN
    CREATE UNIQUE INDEX [IX_FilterOperatorDefinitions_ColumnType_Operator] ON [FilterOperatorDefinitions] ([ColumnType], [Operator]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260918200323_FilterOperatorCatalogue'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260918200323_FilterOperatorCatalogue', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260920155150_ReportViewState'
)
BEGIN
    CREATE TABLE [ReportViewStates] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [ReportId] int NOT NULL,
        [Filters] nvarchar(max) NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ReportViewStates] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ReportViewStates_Reports_ReportId] FOREIGN KEY ([ReportId]) REFERENCES [Reports] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ReportViewStates_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260920155150_ReportViewState'
)
BEGIN
    CREATE INDEX [IX_ReportViewStates_ReportId] ON [ReportViewStates] ([ReportId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260920155150_ReportViewState'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ReportViewStates_UserId_ReportId] ON [ReportViewStates] ([UserId], [ReportId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260920155150_ReportViewState'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260920155150_ReportViewState', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260920161744_ReportSharedViews'
)
BEGIN
    CREATE TABLE [ReportSharedViews] (
        [Id] int NOT NULL IDENTITY,
        [ShortId] nvarchar(10) NOT NULL,
        [ReportId] int NOT NULL,
        [Filters] nvarchar(max) NOT NULL,
        [FiltersHash] nvarchar(64) NOT NULL,
        [CreatedByUserId] int NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_ReportSharedViews] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ReportSharedViews_Reports_ReportId] FOREIGN KEY ([ReportId]) REFERENCES [Reports] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ReportSharedViews_Users_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users] ([Id]) ON DELETE SET NULL
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260920161744_ReportSharedViews'
)
BEGIN
    CREATE INDEX [IX_ReportSharedViews_CreatedByUserId] ON [ReportSharedViews] ([CreatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260920161744_ReportSharedViews'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ReportSharedViews_ReportId_FiltersHash] ON [ReportSharedViews] ([ReportId], [FiltersHash]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260920161744_ReportSharedViews'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ReportSharedViews_ShortId] ON [ReportSharedViews] ([ShortId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260920161744_ReportSharedViews'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260920161744_ReportSharedViews', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260922184807_MoveGlobalAdminToAppPermission'
)
BEGIN
    INSERT INTO [AppPermissionGrants] ([Permission], [UserId], [CreatedAt], [CreatedByUserId])
    SELECT 'GlobalAdmin', [Id], GETUTCDATE(), 0
    FROM [Users]
    WHERE [IsGlobalAdmin] = 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260922184807_MoveGlobalAdminToAppPermission'
)
BEGIN
    DECLARE @var11 nvarchar(max);
    SELECT @var11 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Users]') AND [c].[name] = N'IsGlobalAdmin');
    IF @var11 IS NOT NULL EXEC(N'ALTER TABLE [Users] DROP CONSTRAINT ' + @var11 + ';');
    ALTER TABLE [Users] DROP COLUMN [IsGlobalAdmin];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260922184807_MoveGlobalAdminToAppPermission'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260922184807_MoveGlobalAdminToAppPermission', N'10.0.10');
END;

COMMIT;
GO

