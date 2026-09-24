namespace Reporting.Abstractions;

/// <summary>The kind of value a formula expression or function parameter deals in. <see cref="Any"/> accepts (or, as a return kind, follows) whatever the arguments are.</summary>
public enum FormulaValueKind
{
    Any,
    Number,
    Text,
    Bool,
    Date
}

public enum FormulaFunctionCategory
{
    Math,
    Text,
    Date,
    Logic,
    Conversion
}

public class FormulaParameterDto
{
    public string Name { get; set; } = string.Empty;
    public FormulaValueKind Kind { get; set; }
    public bool IsOptional { get; set; }

    /// <summary>The last parameter may repeat, taking any number of further arguments.</summary>
    public bool IsVariadic { get; set; }
}

/// <summary>One function a formula can call, as the formula builder's palette lists it.</summary>
public class FormulaFunctionDto
{
    public string Name { get; set; } = string.Empty;
    public FormulaFunctionCategory Category { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Example { get; set; } = string.Empty;
    public FormulaValueKind ReturnKind { get; set; }
    public List<FormulaParameterDto> Parameters { get; set; } = new();
}

/// <summary>Creates or replaces a formula column. A null <see cref="Type"/> takes the type the expression evaluates to.</summary>
public class SaveFormulaColumnDto
{
    public string Name { get; set; } = string.Empty;
    public string Expression { get; set; } = string.Empty;
    public DatasetColumnType? Type { get; set; }
}

/// <summary>Evaluates an unsaved expression against a sample of a dataset's rows.</summary>
public class FormulaPreviewRequestDto
{
    public string Expression { get; set; } = string.Empty;
    public DatasetColumnType? Type { get; set; }
    public int SampleSize { get; set; } = 10;
}

/// <summary>A problem in an expression, with where it sits in the text so the editor can point at it.</summary>
public class FormulaErrorDto
{
    public string Message { get; set; } = string.Empty;
    public int Position { get; set; }
    public int Length { get; set; }
}

public class FormulaPreviewRowDto
{
    public Guid RowId { get; set; }

    /// <summary>The computed value in the column's canonical text form; null when blank.</summary>
    public string? Value { get; set; }
    public string? Error { get; set; }

    /// <summary>What this row holds in each column the formula reads, by column name — so a blank or surprising result can be traced to its inputs. Null when the cell is blank.</summary>
    public Dictionary<string, string?> Inputs { get; set; } = new();
}

public class FormulaPreviewDto
{
    public bool IsValid { get; set; }
    public List<FormulaErrorDto> Errors { get; set; } = new();

    /// <summary>The column type the expression evaluates to; null when it can't be told statically.</summary>
    public DatasetColumnType? InferredType { get; set; }
    /// <summary>The columns the formula reads, in dataset order — the keys of each row's <c>Inputs</c>.</summary>
    public List<string> InputColumns { get; set; } = new();

    public List<FormulaPreviewRowDto> Rows { get; set; } = new();
}
