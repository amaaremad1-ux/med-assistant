/**
 * Module 4: FHIR R4 Interoperability Export
 */

export function generateFhirR4Bundle({
  patient = {},
  vitals = {},
  medications = [],
  conditions = [],
}) {
  const patientId = patient.id || 'PATIENT-001';
  const timestamp = new Date().toISOString();

  return {
    resourceType: 'Bundle',
    id: 'fhir-bundle-' + Date.now(),
    meta: {
      versionId: '1',
      lastUpdated: timestamp,
      profile: ['http://hl7.org/fhir/StructureDefinition/Bundle'],
    },
    type: 'collection',
    timestamp,
    entry: [
      {
        fullUrl: 'urn:uuid:patient-' + patientId,
        resource: {
          resourceType: 'Patient',
          id: String(patientId),
          active: true,
          name: [{ use: 'official', text: patient.name || 'Elena Vasquez' }],
          gender: (patient.sex || 'female').toLowerCase(),
          birthDate: patient.age ? (2026 - patient.age) + '-01-01' : '1976-01-01',
        },
      },
      {
        fullUrl: 'urn:uuid:obs-sbp-' + Date.now(),
        resource: {
          resourceType: 'Observation',
          status: 'final',
          category: [
            {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }],
            },
          ],
          code: {
            coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }],
            text: 'Systolic blood pressure',
          },
          subject: { reference: 'Patient/' + patientId },
          effectiveDateTime: timestamp,
          valueQuantity: {
            value: vitals.sbp || 128,
            unit: 'mmHg',
            system: 'http://unitsofmeasure.org',
            code: 'mm[Hg]',
          },
        },
      },
      {
        fullUrl: 'urn:uuid:obs-hr-' + Date.now(),
        resource: {
          resourceType: 'Observation',
          status: 'final',
          category: [
            {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }],
            },
          ],
          code: {
            coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }],
          },
          subject: { reference: 'Patient/' + patientId },
          effectiveDateTime: timestamp,
          valueQuantity: {
            value: vitals.hr || 72,
            unit: 'beats/minute',
            system: 'http://unitsofmeasure.org',
            code: '/min',
          },
        },
      },
      ...(conditions.length ? conditions : ['Essential Hypertension', 'Type 2 Diabetes mellitus']).map((c, idx) => ({
        fullUrl: 'urn:uuid:cond-' + idx + '-' + Date.now(),
        resource: {
          resourceType: 'Condition',
          clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
          code: { text: c },
          subject: { reference: 'Patient/' + patientId },
          recordedDate: timestamp,
        },
      })),
      ...(medications.length ? medications : ['Metformin 500mg', 'Lisinopril 10mg']).map((m, idx) => ({
        fullUrl: 'urn:uuid:med-' + idx + '-' + Date.now(),
        resource: {
          resourceType: 'MedicationStatement',
          status: 'active',
          medicationCodeableConcept: { text: m },
          subject: { reference: 'Patient/' + patientId },
          effectiveDateTime: timestamp,
        },
      })),
    ],
  };
}
