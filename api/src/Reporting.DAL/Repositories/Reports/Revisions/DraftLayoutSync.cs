using Reporting.Abstractions;
using Reporting.Database;

namespace Reporting.DAL.Repositories;

/// <summary>
/// Applies an autosaved draft's tabs and widgets, matched by their client-generated RefIds: drops what's gone,
/// updates what's kept and adds what's new.
/// </summary>
internal static class DraftLayoutSync
{
    public static void Apply(ReportRevision draft, ReportRevisionDto dto)
    {
        var incomingTabRefs = dto.Tabs.Select(t => t.Id).ToHashSet();
        draft.Tabs.RemoveAll(t => !incomingTabRefs.Contains(t.RefId));

        foreach (var tabDto in dto.Tabs)
        {
            var tab = UpsertTab(draft, tabDto);
            SyncWidgets(tab, tabDto);
        }
    }

    private static Tab UpsertTab(ReportRevision draft, TabDto tabDto)
    {
        var tab = draft.Tabs.FirstOrDefault(t => t.RefId == tabDto.Id);
        if (tab is null)
        {
            tab = new Tab();
            tabDto.ApplyTo(tab);
            draft.Tabs.Add(tab);
        }
        else
        {
            tabDto.ApplyTo(tab);
        }
        return tab;
    }

    private static void SyncWidgets(Tab tab, TabDto tabDto)
    {
        var incomingWidgetRefs = tabDto.Widgets.Select(w => w.Id).ToHashSet();
        tab.Widgets.RemoveAll(w => !incomingWidgetRefs.Contains(w.RefId));

        foreach (var widgetDto in tabDto.Widgets)
        {
            var widget = tab.Widgets.FirstOrDefault(w => w.RefId == widgetDto.Id);
            if (widget is null)
            {
                widget = new Widget();
                widgetDto.ApplyTo(widget);
                tab.Widgets.Add(widget);
            }
            else
            {
                widgetDto.ApplyTo(widget);
            }
        }
    }
}
