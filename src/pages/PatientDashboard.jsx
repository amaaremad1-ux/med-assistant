import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import PatientOverview from '../components/PatientOverview.jsx';
import RiskPrediction from '../components/RiskPrediction.jsx';
import ContributingFactors from '../components/ContributingFactors.jsx';
import Biomarkers from '../components/Biomarkers.jsx';
import Recommendations from '../components/Recommendations.jsx';
import MeasurementsTimeline from '../components/MeasurementsTimeline.jsx';

/**
 * Original clinical overview dashboard (Phase 1) — preserved as the
 * Patient Dashboard route. All data remains synthetic.
 */
export default function PatientDashboard() {
  return (
    <>
      <PatientOverview />

      <div className="dashboard-row">
        <RiskPrediction />
        <ContributingFactors />
      </div>

      <Biomarkers />

      <div className="dashboard-row">
        <Recommendations />
        <MeasurementsTimeline />
      </div>

      <MedicalDisclaimer />

      <footer className="dashboard-footer">
        <p>
          This application is a frontend prototype. All patient data is
          synthetic, risk scores are statistical estimates from an unvalidated
          demo model, and nothing here is a medical diagnosis. Always consult a
          qualified healthcare professional.
        </p>
      </footer>
    </>
  );
}
