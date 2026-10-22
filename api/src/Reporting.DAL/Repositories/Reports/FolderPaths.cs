using Reporting.Database;

namespace Reporting.DAL.Repositories;

internal static class FolderPaths
{
    /// <summary>"Home / A / B" for a folder, or "Home" at the root.</summary>
    public static string Describe(int? folderId, IReadOnlyDictionary<int, Folder> foldersById)
    {
        var segments = new List<string>();
        var current = folderId;
        while (current is { } id && foldersById.TryGetValue(id, out var folder))
        {
            segments.Insert(0, folder.Name);
            current = folder.ParentFolderId;
        }
        return segments.Count == 0 ? "Home" : "Home / " + string.Join(" / ", segments);
    }
}
