using Reporting.DAL.Repositories;

namespace Reporting.Tests.Formulas;

/// <summary>The repositories a formula column test drives, built on one fresh change tracker — one "request".</summary>
public sealed record FormulaColumnServices(DatasetFormulaRepository Formulas, DatasetRepository Datasets, DatasetRowRepository Rows);
