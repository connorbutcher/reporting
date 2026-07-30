using Reporting.Api.Domain;

namespace Reporting.Api.Data;

public static class DbSeeder
{
    public static void Seed(ReportingDbContext db)
    {
        if (db.Datasets.Any()) return;

        var dataset = new Dataset { Id = Guid.NewGuid(), Name = "Employees" };

        var employees = new (string Name, int Age, double Salary, bool IsActive, DateTime HireDate)[]
        {
            ("Alice Johnson", 34, 82000.50, true, new DateTime(2019, 3, 14)),
            ("Brian Smith", 41, 95500.00, true, new DateTime(2016, 7, 1)),
            ("Carla Diaz", 28, 71250.75, false, new DateTime(2022, 11, 5)),
            ("David Chen", 39, 88000.00, true, new DateTime(2018, 1, 22)),
        };

        foreach (var e in employees)
        {
            var record = new DatasetRecord { Id = Guid.NewGuid(), DatasetId = dataset.Id };
            record.Fields.Add(new StringFieldValue { Id = Guid.NewGuid(), RecordId = record.Id, DisplayName = "Name", Value = e.Name });
            record.Fields.Add(new IntFieldValue { Id = Guid.NewGuid(), RecordId = record.Id, DisplayName = "Age", Value = e.Age });
            record.Fields.Add(new DoubleFieldValue { Id = Guid.NewGuid(), RecordId = record.Id, DisplayName = "Salary", Value = e.Salary });
            record.Fields.Add(new BoolFieldValue { Id = Guid.NewGuid(), RecordId = record.Id, DisplayName = "Is Active", Value = e.IsActive });
            record.Fields.Add(new DateTimeFieldValue { Id = Guid.NewGuid(), RecordId = record.Id, DisplayName = "Hire Date", Value = e.HireDate });
            dataset.Records.Add(record);
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
}
