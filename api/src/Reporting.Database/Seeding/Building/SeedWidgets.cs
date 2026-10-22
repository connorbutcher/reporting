using System.Globalization;
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
        return Text(text, x, y, w, h, new TextStyle(22, "bold", "#152a55", 1.2, "middle"));
    }

    public static Widget Heading(string text, int x, int y, int w, int h)
    {
        return Text(text, x, y, w, h, new TextStyle(17, "bold", "#152a55", 1.2, "middle"));
    }

    public static Widget Paragraph(string text, int x, int y, int w, int h)
    {
        return Text(text, x, y, w, h, new TextStyle(14, "normal", "#475569", 1.4, "top"));
    }

    /// <summary>Headed paragraphs in two columns, starting at row <paramref name="top"/>.</summary>
    public static void AddSections(Tab tab, (string Heading, string Body)[] sections, int top)
    {
        for (var i = 0; i < sections.Length; i++)
        {
            var x = i % 2 * 24;
            var y = top + i / 2 * 7;
            tab.Widgets.Add(Heading(sections[i].Heading, x, y, 24, 2));
            tab.Widgets.Add(Paragraph(sections[i].Body, x, y + 2, 24, 5));
        }
    }

    private static Widget Text(string text, int x, int y, int w, int h, TextStyle style)
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
                 "content":"{{SeedJson.Escape(text)}}","fontSize":{{style.FontSize}},"fontWeight":"{{style.FontWeight}}",
                 "italic":false,"underline":false,"strikethrough":false,"lineHeight":{{style.LineHeight.ToString(CultureInfo.InvariantCulture)}},
                 "color":"{{style.Color}}","backgroundColor":null,"textAlign":"left","verticalAlign":"{{style.VerticalAlign}}",
                 "wrap":true,"padding":8}
                """,
        };
    }
}
