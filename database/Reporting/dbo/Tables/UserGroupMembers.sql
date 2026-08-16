CREATE TABLE [dbo].[UserGroupMembers] (
    [UserGroupId] INT NOT NULL,
    [UserId]      INT NOT NULL,
    CONSTRAINT [PK_UserGroupMembers] PRIMARY KEY CLUSTERED ([UserGroupId] ASC, [UserId] ASC),
    CONSTRAINT [FK_UserGroupMembers_UserGroups_UserGroupId] FOREIGN KEY ([UserGroupId]) REFERENCES [dbo].[UserGroups] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_UserGroupMembers_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);


GO
CREATE NONCLUSTERED INDEX [IX_UserGroupMembers_UserId]
    ON [dbo].[UserGroupMembers]([UserId] ASC);
