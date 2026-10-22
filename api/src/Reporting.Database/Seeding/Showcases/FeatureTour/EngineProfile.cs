namespace Reporting.Database;

/// <summary>Base power (kW), torque (Nm), cost (£) and hours, and the bearing clearance distribution (mm).</summary>
internal sealed record EngineProfile(
    string Name, double Power, double Torque, double Cost, double Hours, double ClearanceMean, double ClearanceSd);
