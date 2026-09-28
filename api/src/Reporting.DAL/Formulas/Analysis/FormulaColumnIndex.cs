using Reporting.Database;

namespace Reporting.DAL.Formulas.Analysis;

/// <summary>
/// A dataset's columns by name (case-insensitive), built once so checking many formulas against the same
/// columns doesn't rebuild the lookup each time. A name can map to more than one column — the analyzer
/// refuses to guess between them.
/// </summary>
public sealed class FormulaColumnIndex
{
    private static readonly IReadOnlyList<DatasetColumn> NoColumns = [];

    private readonly Dictionary<string, List<DatasetColumn>> _byName = new(StringComparer.OrdinalIgnoreCase);

    public FormulaColumnIndex(IEnumerable<DatasetColumn> columns)
    {
        foreach (var column in columns)
        {
            if (!_byName.TryGetValue(column.Name, out var sameName))
            {
                sameName = [];
                _byName[column.Name] = sameName;
            }

            sameName.Add(column);
        }
    }

    public IReadOnlyList<DatasetColumn> Named(string name)
    {
        return _byName.TryGetValue(name, out var columns) ? columns : NoColumns;
    }
}
