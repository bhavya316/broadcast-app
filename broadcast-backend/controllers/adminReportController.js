const Report   = require("../models/report");
const Student  = require("../models/student");
const Teacher  = require("../models/teacher");

exports.getReports = async (req, res) => {
  try {
    const reports = await Report.findAll({ order: [["createdAt", "DESC"]] });

    const enriched = await Promise.all(reports.map(async (r) => {
      const data = r.toJSON();
      const reporterModel = data.reporter_role === "teacher" ? Teacher : Student;
      const reportedModel = data.reported_role === "teacher" ? Teacher : Student;

      const [reporter, reported] = await Promise.all([
        reporterModel.findByPk(data.reporter_id, { attributes: ["id", "name"] }),
        reportedModel.findByPk(data.reported_id, { attributes: ["id", "name"] })
      ]);

      return {
        ...data,
        reporter_name: reporter?.name ?? "Unknown",
        reported_name: reported?.name ?? "Unknown"
      };
    }));

    return res.json({ success: true, data: enriched });
  } catch (error) {
    console.error("getReports error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.resolveReport = async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    await report.update({ status: "resolved" });
    return res.json({ success: true });
  } catch (error) {
    console.error("resolveReport error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.dismissReport = async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    await report.update({ status: "dismissed" });
    return res.json({ success: true });
  } catch (error) {
    console.error("dismissReport error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    await report.destroy();
    return res.json({ success: true });
  } catch (error) {
    console.error("deleteReport error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};