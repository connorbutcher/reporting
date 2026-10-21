export class TooltipHtml {
  /** Escapes text for an HTML tooltip — labels and cell values are user data. */
  public static escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  public static marker(color: string): string {
    return `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${TooltipHtml.escape(color)};"></span>`;
  }
}
