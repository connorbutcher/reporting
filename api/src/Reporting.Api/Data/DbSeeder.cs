using System.Globalization;
using Reporting.Api.Domain;

namespace Reporting.Api.Data;

public static class DbSeeder
{
    public static void Seed(ReportingDbContext db)
    {
        if (db.Datasets.Any()) return;

        var dataset = new Dataset { Id = Guid.NewGuid(), Name = "Employees" };

        var name = NewColumn(dataset.Id, "Name", DatasetColumnType.String, 0);
        var age = NewColumn(dataset.Id, "Age", DatasetColumnType.Int, 1);
        var salary = NewColumn(dataset.Id, "Salary", DatasetColumnType.Double, 2);
        var isActive = NewColumn(dataset.Id, "Is Active", DatasetColumnType.Bool, 3);
        var hireDate = NewColumn(dataset.Id, "Hire Date", DatasetColumnType.DateTime, 4);
        dataset.Columns.AddRange([name, age, salary, isActive, hireDate]);

        var employees = new (string Name, int Age, double Salary, bool IsActive, DateTime HireDate)[]
        {
            ("Alice Johnson", 34, 82000.50, true, new DateTime(2019, 3, 14)),
            ("Brian Smith", 41, 95500.00, true, new DateTime(2016, 7, 1)),
            ("Carla Diaz", 28, 71250.75, false, new DateTime(2022, 11, 5)),
            ("David Chen", 39, 88000.00, true, new DateTime(2018, 1, 22)),
        };

        foreach (var e in employees)
        {
            var row = new DatasetRow { Id = Guid.NewGuid(), DatasetId = dataset.Id };
            row.SetValues(new Dictionary<Guid, string>
            {
                [name.Id] = e.Name,
                [age.Id] = e.Age.ToString(CultureInfo.InvariantCulture),
                [salary.Id] = e.Salary.ToString(CultureInfo.InvariantCulture),
                [isActive.Id] = e.IsActive.ToString(CultureInfo.InvariantCulture),
                [hireDate.Id] = e.HireDate.ToString("O", CultureInfo.InvariantCulture),
            });
            dataset.Rows.Add(row);
        }

        db.Datasets.Add(dataset);

        var report = new Report { Id = Guid.NewGuid(), Name = "Demo Report" };
        report.Widgets.Add(new Widget
        {
            Id = Guid.NewGuid(),
            ReportId = report.Id,
            Type = WidgetType.DataTable,
            X = 0,
            Y = 0,
            W = 6,
            H = 4,
            ConfigJson = $"{{\"type\":\"dataTable\",\"datasetId\":\"{dataset.Id}\"}}"
        });
        db.Reports.Add(report);

        db.SaveChanges();
    }

    private static DatasetColumn NewColumn(Guid datasetId, string name, DatasetColumnType type, int order) => new()
    {
        Id = Guid.NewGuid(),
        DatasetId = datasetId,
        Name = name,
        Type = type,
        Order = order
    };
}
