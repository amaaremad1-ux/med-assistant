import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AppDataProvider } from './context/AppDataContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import GlobalMedicalCanvas from './components/GlobalMedicalCanvas.jsx';
import LiveVitalsTicker from './components/LiveVitalsTicker.jsx';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import PrototypeNotice from './components/PrototypeNotice.jsx';
import UnifiedDashboard from './pages/UnifiedDashboard.jsx';
import CelineDashboard from './components/celine/CelineDashboard.jsx';

/**
 * The global "synthetic data" notice is accurate for every synthetic page,
 * but contradicts the labeling on the Real Research Cases section (which shows
 * real de-identified research data). Gate it by route so it never renders
 * on the real-data pages — those carry their own badges and warnings.
 */
function PrototypeNoticeGate() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/research-')) return null;
  return <PrototypeNotice />;
}
import PatientDashboard from './pages/PatientDashboard.jsx';
import ResearchDashboard from './pages/ResearchDashboard.jsx';
import HealthProfile from './pages/HealthProfile.jsx';
import DeviceInterface from './pages/DeviceInterface.jsx';
import LongitudinalAnalysis from './pages/LongitudinalAnalysis.jsx';
import RiskIntelligence from './pages/RiskIntelligence.jsx';
import BiomarkerMap from './pages/BiomarkerMap.jsx';
import Counterfactual from './pages/Counterfactual.jsx';
import WhatIfLab from './pages/WhatIfLab.jsx';
import Experiments from './pages/Experiments.jsx';
import ModelRegistry from './pages/ModelRegistry.jsx';
import ValidationStudy from './pages/ValidationStudy.jsx';
import FairnessResearch from './pages/FairnessResearch.jsx';
import FederatedResearch from './pages/FederatedResearch.jsx';
import DiseaseModules from './pages/DiseaseModules.jsx';
import PrivacyData from './pages/PrivacyData.jsx';
import AuditTrail from './pages/AuditTrail.jsx';
import Settings from './pages/Settings.jsx';
import ResearchCases from './pages/ResearchCases.jsx';
import ResearchCaseDetail from './pages/ResearchCaseDetail.jsx';
import ResearchCompare from './pages/ResearchCompare.jsx';
import ResearchAnalytics from './pages/ResearchAnalytics.jsx';
import ResearchMethodology from './pages/ResearchMethodology.jsx';
import MedicalRecords from './pages/MedicalRecords.jsx';
import BloodLabData from './pages/BloodLabData.jsx';
import GeneticProfile from './pages/GeneticProfile.jsx';
import AIAssistant from './pages/AIAssistant.jsx';
import ResearchDataHub from './pages/ResearchDataHub.jsx';
import BioSignalLibrary from './pages/BioSignalLibrary.jsx';
import SignalIntelligence from './pages/SignalIntelligence.jsx';
import SignalEventReplay from './pages/SignalEventReplay.jsx';
import CrossDomainAnalysis from './pages/CrossDomainAnalysis.jsx';
import GeneticExplorer from './pages/GeneticExplorer.jsx';
import DatasetEvidence from './pages/DatasetEvidence.jsx';
import ResearchReportsPage from './pages/ResearchReportsPage.jsx';
import FamilyGenome from './pages/FamilyGenome.jsx';
import LabResearch from './pages/LabResearch.jsx';
import ResearchLab from './pages/ResearchLab.jsx';
import PatientsRiskBoard from './pages/PatientsRiskBoard.jsx';
import ReadmissionForecast from './pages/ReadmissionForecast.jsx';
import PatientTimeline from './pages/PatientTimeline.jsx';
import SmartPharmacy from './pages/SmartPharmacy.jsx';
import ClinicalNotesSOAP from './pages/ClinicalNotesSOAP.jsx';
import ClinicalReportPDF from './pages/ClinicalReportPDF.jsx';


/**
 * App shell: routed clinical prototype. Every page renders inside the shared
 * living background, the live alert bar, the sidebar and the top bar, and
 * carries the research-prototype notice.
 */
export default function App() {
  return (
    <ThemeProvider>
      <AppDataProvider>
        <BrowserRouter>
          {/* One living background for every module. It is fixed behind the
              whole shell, so the particle mesh, glass glyphs, mosaic and ECG
              line never restart while the user navigates. It is purely
              decorative, so if it ever fails to draw the boundary renders
              nothing instead of an error box behind the whole interface. */}
          <ErrorBoundary label="The living background" variant="silent">
            <GlobalMedicalCanvas />
          </ErrorBoundary>

          <div className="app-shell">
            <ErrorBoundary label="The navigation sidebar">
              <Sidebar />
            </ErrorBoundary>

            <div className="app-main">
              <ErrorBoundary label="The live vitals ticker" variant="silent">
                <LiveVitalsTicker />
              </ErrorBoundary>
              <ErrorBoundary label="The top bar">
                <Topbar />
              </ErrorBoundary>


              <main className="dashboard">
                <PrototypeNoticeGate />

                <ErrorBoundary label="This page">
                <Routes>
                  <Route path="/" element={<ResearchDashboard />} />
                  <Route path="/celine" element={<CelineDashboard />} />
                  <Route path="/unified-dashboard" element={<UnifiedDashboard />} />
                  <Route path="/patient" element={<PatientDashboard />} />
                  <Route path="/profile" element={<HealthProfile />} />
                  <Route path="/device" element={<DeviceInterface />} />
                  <Route path="/records" element={<MedicalRecords />} />
                  <Route path="/blood-lab" element={<BloodLabData />} />
                  <Route path="/lab-research" element={<LabResearch />} />
                  <Route path="/genetic" element={<GeneticProfile />} />
                  <Route path="/genetic-explorer" element={<GeneticExplorer />} />
                  <Route path="/assistant" element={<AIAssistant />} />
                  <Route path="/longitudinal" element={<LongitudinalAnalysis />} />
                  <Route path="/risk" element={<RiskIntelligence />} />
                  <Route path="/biomarker-map" element={<BiomarkerMap />} />
                  <Route path="/counterfactual" element={<Counterfactual />} />
                  <Route path="/whatif" element={<WhatIfLab />} />
                  <Route path="/lab" element={<Experiments />} />
                  <Route path="/models" element={<ModelRegistry />} />
                  <Route path="/validation" element={<ValidationStudy />} />
                  <Route path="/fairness" element={<FairnessResearch />} />
                  <Route path="/federated" element={<FederatedResearch />} />
                  <Route path="/modules" element={<DiseaseModules />} />
                  <Route path="/privacy" element={<PrivacyData />} />
                  <Route path="/audit" element={<AuditTrail />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/research-hub" element={<ResearchDataHub />} />
                  <Route path="/signals" element={<BioSignalLibrary />} />
                  <Route path="/signal-intelligence" element={<SignalIntelligence />} />
                  <Route path="/signal-replay" element={<SignalEventReplay />} />
                  <Route path="/cross-domain" element={<CrossDomainAnalysis />} />
                  <Route path="/dataset-builder" element={<DatasetEvidence />} />
                  <Route path="/research-reports" element={<ResearchReportsPage />} />
                  <Route path="/research-lab" element={<ResearchLab />} />
                  <Route path="/family-genome" element={<FamilyGenome />} />
                  <Route path="/research-cases" element={<ResearchCases />} />
                  <Route path="/research-cases/:id" element={<ResearchCaseDetail />} />
                  <Route path="/research-compare" element={<ResearchCompare />} />
                  <Route path="/research-analytics" element={<ResearchAnalytics />} />
                  <Route path="/research-methodology" element={<ResearchMethodology />} />
                  <Route path="/clinical-report" element={<ClinicalReportPDF />} />
                  <Route path="/patients" element={<PatientsRiskBoard />} />
                  <Route path="/readmission" element={<ReadmissionForecast />} />
                  <Route path="/timeline" element={<PatientTimeline />} />
                  <Route path="/pharmacy" element={<SmartPharmacy />} />
                  <Route path="/notes" element={<ClinicalNotesSOAP />} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </ErrorBoundary>
              </main>
            </div>
          </div>
        </BrowserRouter>
      </AppDataProvider>
    </ThemeProvider>
  );
}
