using Reporting.Abstractions;

namespace Reporting.Database;

internal static class SeedWidgets
{
    /// <summary>A widget whose config is written later, once its dataset has an id.</summary>
    public static Widget Placeholder(Tab tab, WidgetType type, int x, int y, int w, int h)
    {
        var widget = new Widget { RefId = Guid.NewGuid(), Type = type, X = x, Y = y, W = w, H = h, ConfigJson = "{}" };
        tab.Widgets.Add(widget);
        return widget;
    }

    public static Widget Title(string text)
    {
        return Title(text, 0, 0, 8, 1);
    }

    public static Widget Title(string text, int x, int y, int w, int h)
    {
        return new Widget
        {
            RefId = Guid.NewGuid(),
            Type = WidgetType.StaticText,
            X = x,
            Y = y,
            W = w,
            H = h,
            ConfigJson = $$"""
                {"type":"staticText","title":"Text","showTitle":false,
                 "content":"{{text}}","fontSize":22,"fontWeight":"bold",
                 "italic":false,"underline":false,"strikethrough":false,"lineHeight":1.2,
                 "color":"#152a55","backgroundColor":null,"textAlign":"left","verticalAlign":"middle",
                 "wrap":true,"padding":8}
                """,
        };
    }

    public static Widget Paragraph(string text, int x, int y, int w, int h)
    {
        return new Widget
        {
            RefId = Guid.NewGuid(),
            Type = WidgetType.StaticText,
            X = x,
            Y = y,
            W = w,
            H = h,
            ConfigJson = $$"""
                {"type":"staticText","title":"Text","showTitle":false,
                 "content":"{{text}}","fontSize":14,"fontWeight":"normal",
                 "italic":false,"underline":false,"strikethrough":false,"lineHeight":1.4,
                 "color":"#475569","backgroundColor":null,"textAlign":"left","verticalAlign":"top",
                 "wrap":true,"padding":8}
                """,
        };
    }
}
