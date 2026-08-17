CREATE TABLE [dbo].[DatasetCells] (
    [Id]          INT            IDENTITY (1, 1) NOT NULL,
    [RowId]       INT            NOT NULL,
    [ColumnId]    INT            NOT NULL,
    [StringValue] NVARCHAR (450) NULL,
    [NumberValue] FLOAT (53)     SPARSE NULL,
    [BoolValue]   BIT            SPARSE NULL,
    [DateValue]   DATETIME2 (7)  SPARSE NULL,
    CONSTRAINT [PK_DatasetCells] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_DatasetCells_DatasetRows_RowId] FOREIGN KEY ([RowId]) REFERENCES [dbo].[DatasetRows] ([Id]) ON DELETE CASCADE
);


GO
CREATE NONCLUSTERED INDEX [IX_DatasetCells_ColumnId_DateValue]
    ON [dbo].[DatasetCells]([ColumnId] ASC, [DateValue] ASC) WHERE [DateValue] IS NOT NULL;


GO
CREATE NONCLUSTERED INDEX [IX_DatasetCells_ColumnId_NumberValue]
    ON [dbo].[DatasetCells]([ColumnId] ASC, [NumberValue] ASC) WHERE [NumberValue] IS NOT NULL;


GO
CREATE NONCLUSTERED INDEX [IX_DatasetCells_ColumnId_StringValue]
    ON [dbo].[DatasetCells]([ColumnId] ASC, [StringValue] ASC) WHERE [StringValue] IS NOT NULL;


GO
CREATE UNIQUE NONCLUSTERED INDEX [IX_DatasetCells_RowId_ColumnId]
    ON [dbo].[DatasetCells]([RowId] ASC, [ColumnId] ASC);

