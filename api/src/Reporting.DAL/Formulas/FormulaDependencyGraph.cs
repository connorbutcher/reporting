using Reporting.Database;

namespace Reporting.DAL.Formulas;

/// <summary>
/// The cross-formula dependency graph within a dataset — cycle detection and the dependency-first
/// order a whole recompute pass needs. Keyed by <see cref="DatasetColumn.RefId"/>, not the int id:
/// a column being validated before its first save has no id yet.
/// </summary>
public static class FormulaDependencyGraph
{
    /// <summary>
    /// Formula-to-formula dependency edges. A dependency on an ordinary column isn't an edge —
    /// ordinary columns need no ordering, since every formula sees the row's full set of non-formula
    /// values up front. A formula that fails to parse contributes no edges — it's already flagged
    /// broken and can't meaningfully participate in the graph.
    /// </summary>
    public static Dictionary<Guid, List<Guid>> Build(IReadOnlyList<DatasetColumn> columns)
    {
        var byName = new Dictionary<string, DatasetColumn>(StringComparer.OrdinalIgnoreCase);
        foreach (var column in columns) byName.TryAdd(column.Name, column);

        var graph = new Dictionary<Guid, List<Guid>>();
        foreach (var column in columns.Where(c => c.IsComputed))
        {
            var deps = new List<Guid>();
            if (!string.IsNullOrWhiteSpace(column.FormulaExpression))
            {
                try
                {
                    var ast = FormulaParser.Parse(column.FormulaExpression);
                    foreach (var name in FormulaParser.ReferencedColumnNames(ast))
                        if (byName.TryGetValue(name, out var dep) && dep.IsComputed) deps.Add(dep.RefId);
                }
                catch (FormulaParseException)
                {
                    // Already broken; TopologicalOrder still needs an entry for it (with no edges).
                }
            }
            graph[column.RefId] = deps;
        }
        return graph;
    }

    /// <summary>
    /// Dependency-first order over every node in <paramref name="graph"/> (a dependency always comes
    /// before anything that reads it), so a chained formula sees its dependency's freshly recomputed
    /// value. Throws <see cref="FormulaValidationException"/> naming the loop if the graph has a cycle.
    /// </summary>
    public static List<Guid> TopologicalOrder(Dictionary<Guid, List<Guid>> graph)
    {
        var order = new List<Guid>();
        var state = new Dictionary<Guid, int>(); // 0/absent = unvisited, 1 = in progress, 2 = done

        foreach (var id in graph.Keys) Visit(id, []);
        return order;

        void Visit(Guid id, List<Guid> path)
        {
            if (state.TryGetValue(id, out var s))
            {
                if (s == 2) return;
                if (s == 1)
                {
                    var start = path.IndexOf(id);
                    var cycle = string.Join(" → ", path.Skip(start).Append(id));
                    throw new FormulaValidationException($"These formulas depend on each other in a loop: {cycle}.");
                }
            }

            state[id] = 1;
            path.Add(id);
            foreach (var dep in graph.GetValueOrDefault(id, [])) Visit(dep, path);
            path.RemoveAt(path.Count - 1);
            state[id] = 2;
            order.Add(id);
        }
    }
}
