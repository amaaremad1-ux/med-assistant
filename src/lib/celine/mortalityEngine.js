/**
 * Module 10: SOFA, qSOFA, APACHE II & Mortality Multi-Score Engine
 */

export function calculateCompositeMortality({
  sofaScore = 6,
  qSofaScore = 1,
  apacheScore = 14,
  mnews2Score = 5,
}) {
  let sofaMortality = 3;
  if (sofaScore >= 12) sofaMortality = 82;
  else if (sofaScore >= 10) sofaMortality = 54;
  else if (sofaScore >= 8) sofaMortality = 36;
  else if (sofaScore >= 6) sofaMortality = 25;
  else if (sofaScore >= 4) sofaMortality = 16;
  else if (sofaScore >= 2) sofaMortality = 7;

  let apacheMortality = 4;
  if (apacheScore >= 35) apacheMortality = 88;
  else if (apacheScore >= 30) apacheMortality = 75;
  else if (apacheScore >= 25) apacheMortality = 55;
  else if (apacheScore >= 20) apacheMortality = 40;
  else if (apacheScore >= 15) apacheMortality = 25;
  else if (apacheScore >= 10) apacheMortality = 15;
  else if (apacheScore >= 5) apacheMortality = 8;

  const compositeMortality = Math.round((sofaMortality * 0.4) + (apacheMortality * 0.4) + (mnews2Score * 2.5) + (qSofaScore * 5));
  const boundedMortality = Math.max(2, Math.min(96, compositeMortality));

  const septicShock6hTrajectory = [
    { hour: '0h (Now)', probability: Math.round(boundedMortality * 0.7) },
    { hour: '+1h', probability: Math.round(boundedMortality * 0.76) },
    { hour: '+2h', probability: Math.round(boundedMortality * 0.83) },
    { hour: '+3h', probability: Math.round(boundedMortality * 0.91) },
    { hour: '+4h', probability: Math.round(boundedMortality * 0.97) },
    { hour: '+5h', probability: Math.round(boundedMortality * 1.04) },
    { hour: '+6h', probability: Math.min(99, Math.round(boundedMortality * 1.12)) },
  ];

  return {
    sofaScore,
    qSofaScore,
    apacheScore,
    mnews2Score,
    sofaMortality: sofaMortality + '%',
    apacheMortality: apacheMortality + '%',
    compositeMortality: boundedMortality + '%',
    mortalityTone: boundedMortality >= 50 ? 'bad' : boundedMortality >= 25 ? 'warn' : 'good',
    septicShock6hTrajectory,
  };
}
