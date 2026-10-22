using Reporting.Abstractions;

namespace Reporting.Database;

internal static class SpecDatasets
{
    public static SpecDataset Build(
        SeedBatch batch, string name, string sourceConfigJson, string characteristicName,
        double lslValue, double uslValue, string limitFormat)
    {
        var dataset = SeedDatasets.Create(name, DatasetSourceIds.Assembly, sourceConfigJson);
        var characteristic = SeedDatasets.Column(dataset, "Characteristic", DatasetColumnType.String, 0);
        var lsl = SeedDatasets.Column(dataset, "LSL", DatasetColumnType.Double, 1, limitFormat);
        var usl = SeedDatasets.Column(dataset, "USL", DatasetColumnType.Double, 2, limitFormat);

        var rowRef = Guid.NewGuid();
        var row = new DatasetRow { RefId = rowRef };
        dataset.Rows.Add(row);
        batch.AddCell(row, characteristic, characteristicName);
        batch.AddCell(row, lsl, SeedFormats.Num(lslValue));
        batch.AddCell(row, usl, SeedFormats.Num(uslValue));

        return new SpecDataset(dataset, rowRef, lsl, usl);
    }

    public static string BandJson(SpecDataset spec, string axis = "y")
    {
        return ChartWidgetJson.SpecBand(spec.Dataset.Id, spec.RowRef, spec.Lsl.RefId, spec.Usl.RefId, axis);
    }

    public static string KpiToleranceJson(SpecDataset spec)
    {
        return KpiWidgetJson.Tolerance(spec.Dataset.Id, spec.RowRef, spec.Lsl.RefId, spec.Usl.RefId);
    }
}
