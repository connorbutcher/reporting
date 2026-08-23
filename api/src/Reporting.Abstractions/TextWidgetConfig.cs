namespace Reporting.Abstractions;

public enum TextFontWeight
{
    Normal,
    Medium,
    Semibold,
    Bold
}

public enum TextAlign
{
    Left,
    Center,
    Right,
    Justify
}

public enum TextVerticalAlign
{
    Top,
    Middle,
    Bottom
}

public class StaticTextWidgetConfig : WidgetConfig
{
    /// <summary>Plain text; line breaks are preserved, never rendered as HTML.</summary>
    public string Content { get; set; } = string.Empty;

    public int FontSize { get; set; } = 16;
    public TextFontWeight FontWeight { get; set; } = TextFontWeight.Normal;
    public bool Italic { get; set; }
    public bool Underline { get; set; }
    public bool Strikethrough { get; set; }
    public double LineHeight { get; set; } = 1.4;

    public string Color { get; set; } = "#1f2937";

    /// <summary>Null means transparent.</summary>
    public string? BackgroundColor { get; set; }

    public TextAlign TextAlign { get; set; } = TextAlign.Left;
    public TextVerticalAlign VerticalAlign { get; set; } = TextVerticalAlign.Top;

    /// <summary>False lets long lines overflow with a scrollbar instead of wrapping.</summary>
    public bool Wrap { get; set; } = true;

    public int Padding { get; set; } = 12;
}
