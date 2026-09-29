/**
 * Module 9: Pharmacogenomics Risk Matrix & CYP450 Engine
 */

export const PGX_GENE_DRUG_DATABASE = [
  { gene: 'CYP2C19', phenotype: 'Poor Metabolizer (*2/*2 or *2/*3)', prevalence: '15% Asian, 3-5% Caucasian', drug: 'Clopidogrel (Plavix)', mechanism: 'Inability to bioactivate prodrug into active antiplatelet thiol metabolite.', clinicalRisk: 'Stent thrombosis & stroke bounce-back from antiplatelet resistance.', recommendation: 'Switch immediately to Prasugrel or Ticagrelor.', severity: 'critical' },
  { gene: 'VKORC1 / CYP2C9', phenotype: 'CYP2C9*3 / VKORC1 -1639G>A Variant', prevalence: '30% of total population', drug: 'Warfarin (Coumadin)', mechanism: 'Severely impaired clearance of S-warfarin & hyper-sensitive VKOR.', clinicalRisk: 'Major spontaneous GI and intracerebral hemorrhage.', recommendation: 'Reduce dose by 50-70% with daily INR, or migrate to DOAC (Apixaban).', severity: 'critical' },
  { gene: 'CYP2D6', phenotype: 'Ultra-Rapid Metabolizer (*1xN or *2xN)', prevalence: '5-10% in Middle Eastern & Caucasian', drug: 'Codeine / Tramadol', mechanism: 'Ultra-rapid conversion of prodrug into free morphine.', clinicalRisk: 'Life-threatening respiratory depression at standard doses.', recommendation: 'Strictly avoid codeine/tramadol. Use non-CYP2D6 analgesics.', severity: 'critical' },
  { gene: 'SLCO1B1', phenotype: 'SLCO1B1*5 (521T>C)', prevalence: '15-20% European', drug: 'Simvastatin / Atorvastatin', mechanism: 'Reduced OATP1B1 hepatic uptake transporter causes statin accumulation.', clinicalRisk: 'Severe statin-induced myopathy and rhabdomyolysis.', recommendation: 'Switch to Rosuvastatin (<=10mg) or Pravastatin.', severity: 'moderate' },
  { gene: 'DPYD', phenotype: 'DPYD *2A / *13 Intermediate or Poor', prevalence: '3-8% global', drug: 'Fluorouracil (5-FU) / Capecitabine', mechanism: 'Deficiency of dihydropyrimidine dehydrogenase catabolic enzyme.', clinicalRisk: 'Lethal hematologic toxicity, severe mucositis, and sepsis.', recommendation: '50% dose reduction for intermediate; complete avoidance for poor metabolizers.', severity: 'critical' },
];

export function checkPgxInteractions(drugList = []) {
  const alerts = [];
  drugList.forEach((drugName) => {
    const match = PGX_GENE_DRUG_DATABASE.find((item) =>
      item.drug.toLowerCase().includes(drugName.toLowerCase()) || drugName.toLowerCase().includes(item.drug.toLowerCase())
    );
    if (match) alerts.push(match);
  });
  return alerts;
}
