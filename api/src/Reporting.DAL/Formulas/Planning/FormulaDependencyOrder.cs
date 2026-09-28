using Reporting.Database;

namespace Reporting.DAL.Formulas.Planning;

/// <summary>
/// Puts computed columns in an order where each comes after every computed column its formula reads.
/// Columns that never become ready are part of, or hang off, a circular reference.
/// </summary>
public static class FormulaDependencyOrder
{
    /// <param name="dependencies">Each computed column and the computed columns its formula reads.</param>
    /// <returns>The columns in dependency order, and the ones that couldn't be ordered.</returns>
    public static (List<DatasetColumn> Ordered, List<DatasetColumn> Cyclic) Sort(
        Dictionary<DatasetColumn, List<DatasetColumn>> dependencies)
    {
        var ordered = new List<DatasetColumn>(dependencies.Count);
        var placed = new HashSet<DatasetColumn>(ReferenceEqualityComparer.Instance);

        bool progressed;
        do
        {
            progressed = false;
            foreach (var (column, reads) in dependencies)
            {
                if (placed.Contains(column) || !AllPlaced(reads, placed))
                {
                    continue;
                }

                ordered.Add(column);
                placed.Add(column);
                progressed = true;
            }
        }
        while (progressed);

        var cyclic = new List<DatasetColumn>();
        foreach (var column in dependencies.Keys)
        {
            if (!placed.Contains(column))
            {
                cyclic.Add(column);
            }
        }

        return (ordered, cyclic);
    }

    private static bool AllPlaced(List<DatasetColumn> reads, HashSet<DatasetColumn> placed)
    {
        foreach (var read in reads)
        {
            if (!placed.Contains(read))
            {
                return false;
            }
        }

        return true;
    }
}
