/**
 * Module 8: START Mass Casualty Triage Protocol
 */

export function classifyStartTriage({
  canWalk = false,
  breathing = true,
  rr = 22,
  hasRadialPulse = true,
  capillaryRefillSec = 2,
  followsCommands = true,
}) {
  if (canWalk) return { category: 'GREEN', label: 'Minor / Walking Wounded', color: '#10b981', tone: 'good', urgency: 'Low - Delay up to 3h', action: 'Direct to secondary staging area' };
  if (!breathing) return { category: 'BLACK', label: 'Expectant / Deceased', color: '#1f2937', tone: 'neutral', urgency: 'Palliative comfort / No CPR in disaster', action: 'Mark expectant, conserve resources' };
  if (rr > 30 || rr < 10) return { category: 'RED', label: 'Immediate / Critical', color: '#ef4444', tone: 'bad', urgency: 'Immediate transport within minutes', action: 'Airway control, needle decompression' };
  if (!hasRadialPulse || capillaryRefillSec > 2) return { category: 'RED', label: 'Immediate / Shock State', color: '#ef4444', tone: 'bad', urgency: 'Hemorrhage control & resuscitation', action: 'Tourniquet, massive transfusion' };
  if (!followsCommands) return { category: 'RED', label: 'Immediate / Acute Neuro Deficit', color: '#ef4444', tone: 'bad', urgency: 'Expanding hematoma or severe shock', action: 'C-spine protection, urgent neuro consult' };
  return { category: 'YELLOW', label: 'Delayed / Serious', color: '#f59e0b', tone: 'warn', urgency: 'Medium - Delay 45-60 min', action: 'Splint fractures, analgesia, vitals q15m' };
}

export function generateDisasterCohort(count = 12) {
  const incidentCases = [
    { name: 'Casualty #01 - Blast Trajectory', canWalk: false, breathing: true, rr: 34, hasRadialPulse: false, capillaryRefillSec: 4, followsCommands: false },
    { name: 'Casualty #02 - Compound Tibia Fracture', canWalk: false, breathing: true, rr: 20, hasRadialPulse: true, capillaryRefillSec: 1.5, followsCommands: true },
    { name: 'Casualty #03 - Superficial Lacerations', canWalk: true, breathing: true, rr: 18, hasRadialPulse: true, capillaryRefillSec: 1.2, followsCommands: true },
    { name: 'Casualty #04 - Traumatic Cardiac Arrest', canWalk: false, breathing: false, rr: 0, hasRadialPulse: false, capillaryRefillSec: 6, followsCommands: false },
    { name: 'Casualty #05 - Severe Inhalation Injury', canWalk: false, breathing: true, rr: 36, hasRadialPulse: true, capillaryRefillSec: 2.8, followsCommands: false },
    { name: 'Casualty #06 - Closed Radius Fracture', canWalk: true, breathing: true, rr: 16, hasRadialPulse: true, capillaryRefillSec: 1.1, followsCommands: true },
    { name: 'Casualty #07 - Pelvic Crush Injury', canWalk: false, breathing: true, rr: 24, hasRadialPulse: false, capillaryRefillSec: 3.5, followsCommands: true },
    { name: 'Casualty #08 - Severe Concussion / Lethargy', canWalk: false, breathing: true, rr: 18, hasRadialPulse: true, capillaryRefillSec: 1.8, followsCommands: false },
  ];
  return Array.from({ length: count }, (_, i) => {
    const template = incidentCases[i % incidentCases.length];
    const triage = classifyStartTriage(template);
    return {
      id: 'CASUALTY-' + String(i + 1).padStart(3, '0'),
      ...template,
      ...triage,
      assignedZone: triage.category === 'RED' ? 'Trauma Resus Bay 1' : triage.category === 'YELLOW' ? 'Urgent Step-Down Zone' : triage.category === 'GREEN' ? 'Ambulatory Triage Tent' : 'Holding Morgue Morg-A',
    };
  });
}
