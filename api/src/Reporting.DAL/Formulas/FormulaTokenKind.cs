namespace Reporting.DAL.Formulas;

public enum FormulaTokenKind
{
    Number,
    String,

    /// <summary>A <c>[Column Name]</c> reference — the brackets are consumed by the lexer, so
    /// downstream code only ever sees the bare name.</summary>
    ColumnRef,

    /// <summary>A bare word: a function name, or one of the keywords AND/OR/NOT/TRUE/FALSE (the
    /// parser tells those apart, not the lexer).</summary>
    Identifier,

    /// <summary>An operator or piece of punctuation: + - * / ( ) , = &lt;&gt; &lt; &lt;= &gt; &gt;=.</summary>
    Symbol,
    End,
}
