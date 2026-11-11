import { GOALS, targetFor, dayTotals, bmr } from './nutrition.js';
import { addDays, weekday, todayKey } from './dates.js';
import { getDay } from './store.js';

export const WARM = 6; // minutes d'échauffement
export const STEP_KCAL = 250; // écart qui déclenche un palier
export const STEP_PCT = 5; // % par palier
export const MAX_STEPS = 4; // ±20 %

/*
 * Bibliothèque d'exercices.
 * kind : 'kg' (charge), 'bw' (poids du corps, en répétitions), 'sec' (tenue, en secondes)
 * heavy : exercice où l'on pousse lourd → progression de 2,5 kg, pas au choix 1 / 2,5 / 5 / 10 kg
 *         sinon progression de 1 kg, pas au choix 0,5 / 1 / 2,5 kg
 * kg / reps / sec : point de départ suggéré (tu l'ajustes, l'app retient ta valeur)
 */
export const EXERCISES = {
  // Jambes
  'Squat': { kind: 'kg', kg: 40, heavy: true, gear: 'Barre' },
  'Presse à cuisses': { kind: 'kg', kg: 80, heavy: true, gear: 'Machine' },
  'Hack squat': { kind: 'kg', kg: 40, heavy: true, gear: 'Machine' },
  'Goblet squat': { kind: 'kg', kg: 16, gear: 'Haltère ou kettlebell' },
  'Squat au poids du corps': { kind: 'bw', reps: 20, gear: 'Sans matériel' },
  'Fentes bulgares': { kind: 'kg', kg: 10, per: true, gear: 'Haltères + banc' },
  'Fentes marchées': { kind: 'kg', kg: 10, per: true, gear: 'Haltères' },
  'Step-up sur banc': { kind: 'kg', kg: 8, per: true, gear: 'Haltères + banc' },
  'Fentes au poids du corps': { kind: 'bw', reps: 12, side: true, gear: 'Sans matériel' },
  'Soulevé de terre roumain': { kind: 'kg', kg: 40, heavy: true, gear: 'Barre' },
  'Soulevé de terre roumain haltères': { kind: 'kg', kg: 16, per: true, gear: 'Haltères' },
  'Hip thrust': { kind: 'kg', kg: 40, heavy: true, gear: 'Barre + banc' },
  'Leg curl': { kind: 'kg', kg: 30, gear: 'Machine' },
  'Pont fessier': { kind: 'bw', reps: 15, gear: 'Sans matériel' },
  'Soulevé de terre': { kind: 'kg', kg: 60, heavy: true, gear: 'Barre' },
  'Soulevé de terre trap bar': { kind: 'kg', kg: 60, heavy: true, gear: 'Trap bar' },
  // Poussée
  'Développé couché': { kind: 'kg', kg: 40, heavy: true, gear: 'Barre + banc' },
  'Développé couché haltères': { kind: 'kg', kg: 14, per: true, gear: 'Haltères + banc' },
  'Presse pectoraux': { kind: 'kg', kg: 40, heavy: true, gear: 'Machine' },
  'Pompes': { kind: 'bw', reps: 12, gear: 'Sans matériel' },
  'Pompes sur les genoux': { kind: 'bw', reps: 12, gear: 'Sans matériel' },
  'Développé militaire haltères': { kind: 'kg', kg: 12, per: true, gear: 'Haltères' },
  'Développé militaire barre': { kind: 'kg', kg: 25, heavy: true, gear: 'Barre' },
  'Presse épaules': { kind: 'kg', kg: 30, gear: 'Machine' },
  'Pompes piquées': { kind: 'bw', reps: 8, gear: 'Sans matériel' },
  'Dips': { kind: 'bw', reps: 8, gear: 'Barres parallèles' },
  'Développé couché prise serrée': { kind: 'kg', kg: 30, heavy: true, gear: 'Barre + banc' },
  'Pompes diamant': { kind: 'bw', reps: 10, gear: 'Sans matériel' },
  'Dips sur banc': { kind: 'bw', reps: 12, gear: 'Banc' },
  'Extensions triceps': { kind: 'kg', kg: 15, gear: 'Poulie' },
  'Barre au front': { kind: 'kg', kg: 20, gear: 'Barre EZ + banc' },
  'Extension haltère nuque': { kind: 'kg', kg: 12, gear: 'Haltère' },
  'Kickback haltère': { kind: 'kg', kg: 6, per: true, gear: 'Haltère' },
  // Tirage
  'Tractions': { kind: 'bw', reps: 6, gear: 'Barre de traction' },
  'Tirage vertical': { kind: 'kg', kg: 40, heavy: true, gear: 'Poulie haute' },
  'Tractions assistées': { kind: 'bw', reps: 8, gear: 'Élastique ou machine' },
  'Rowing inversé': { kind: 'bw', reps: 10, gear: 'Barre basse ou sangles' },
  'Rowing barre': { kind: 'kg', kg: 35, heavy: true, gear: 'Barre' },
  'Rowing haltère un bras': { kind: 'kg', kg: 16, gear: 'Haltère + banc' },
  'Tirage horizontal': { kind: 'kg', kg: 40, heavy: true, gear: 'Poulie basse' },
  'Rowing machine': { kind: 'kg', kg: 40, heavy: true, gear: 'Machine' },
  'Face pull': { kind: 'kg', kg: 15, gear: 'Poulie + corde' },
  'Oiseau haltères': { kind: 'kg', kg: 6, per: true, gear: 'Haltères' },
  'Pec deck inversé': { kind: 'kg', kg: 25, gear: 'Machine' },
  'Tirage élastique': { kind: 'bw', reps: 15, gear: 'Élastique' },
  'Curl biceps': { kind: 'kg', kg: 10, per: true, gear: 'Haltères' },
  'Curl marteau': { kind: 'kg', kg: 10, per: true, gear: 'Haltères' },
  'Curl barre EZ': { kind: 'kg', kg: 20, gear: 'Barre EZ' },
  'Curl poulie': { kind: 'kg', kg: 15, gear: 'Poulie basse' },
  // Gainage
  'Gainage': { kind: 'sec', sec: 45, gear: 'Sans matériel' },
  'Gainage latéral': { kind: 'sec', sec: 30, side: true, gear: 'Sans matériel' },
  'Dead bug': { kind: 'bw', reps: 12, gear: 'Sans matériel' },
  'Relevés de jambes': { kind: 'bw', reps: 10, gear: 'Barre ou banc' },
  'Roue abdominale': { kind: 'bw', reps: 8, gear: 'Roue' },
  'Pallof press': { kind: 'kg', kg: 10, gear: 'Poulie ou élastique' },
  'Rotation russe': { kind: 'bw', reps: 20, gear: 'Sans matériel' },
  // Sans machine ni barre (maison, salle peu équipée)
  'Pompes prise serrée': { kind: 'bw', reps: 10, gear: 'Sans matériel' },
  'Rowing sous une table': { kind: 'bw', reps: 8, gear: 'Table solide' },
  'Rowing élastique': { kind: 'bw', reps: 15, gear: 'Élastique' },
  'Superman': { kind: 'bw', reps: 15, gear: 'Sans matériel' },
  'Y-T-W au sol': { kind: 'bw', reps: 12, gear: 'Sans matériel' },
  'Curl élastique': { kind: 'bw', reps: 15, gear: 'Élastique' },
  // Machines et postes supplémentaires
  'Squat guidé': { kind: 'kg', kg: 30, heavy: true, gear: 'Smith machine' },
  'Leg extension': { kind: 'kg', kg: 30, gear: 'Machine' },
  'Adducteurs': { kind: 'kg', kg: 30, gear: 'Machine' },
  'Abducteurs': { kind: 'kg', kg: 30, gear: 'Machine' },
  'Mollets à la machine': { kind: 'kg', kg: 40, gear: 'Machine à mollets, Smith ou presse' },
  'Mollets haltères': { kind: 'kg', kg: 12, per: true, gear: 'Haltères' },
  'Extensions lombaires': { kind: 'bw', reps: 12, gear: 'Banc à lombaires' },
  'Développé couché guidé': { kind: 'kg', kg: 30, heavy: true, gear: 'Smith machine + banc' },
  'Développé incliné haltères': { kind: 'kg', kg: 12, per: true, gear: 'Haltères + banc incliné' },
  'Développé incliné barre': { kind: 'kg', kg: 30, heavy: true, gear: 'Barre + banc incliné' },
  'Butterfly': { kind: 'kg', kg: 25, gear: 'Machine' },
  'Écarté à la poulie': { kind: 'kg', kg: 10, per: true, gear: 'Poulie vis-à-vis' },
  'Écarté haltères': { kind: 'kg', kg: 8, per: true, gear: 'Haltères + banc' },
  'Développé épaules guidé': { kind: 'kg', kg: 20, heavy: true, gear: 'Smith machine + banc' },
  'Élévations latérales': { kind: 'kg', kg: 6, per: true, gear: 'Haltères' },
  'Élévations latérales à la poulie': { kind: 'kg', kg: 5, gear: 'Poulie basse' },
  'Élévations latérales élastique': { kind: 'bw', reps: 15, gear: 'Élastique' },
  'Dips à la machine': { kind: 'kg', kg: 40, gear: 'Machine' },
  'Extensions triceps à la machine': { kind: 'kg', kg: 25, gear: 'Machine' },
  'Rowing aux sangles': { kind: 'bw', reps: 10, gear: 'Sangles (TRX)' },
  'Rowing T-bar': { kind: 'kg', kg: 30, heavy: true, gear: 'T-bar' },
  'Curl barre': { kind: 'kg', kg: 20, gear: 'Barre' },
  'Curl au pupitre': { kind: 'kg', kg: 20, gear: 'Machine' },
  'Curl incliné haltères': { kind: 'kg', kg: 8, per: true, gear: 'Haltères + banc incliné' },
  'Relevés de genoux à la chaise romaine': { kind: 'bw', reps: 10, gear: 'Chaise romaine' },
  'Relevés de jambes suspendu': { kind: 'bw', reps: 8, gear: 'Barre de traction' },
  'Crunch': { kind: 'bw', reps: 15, gear: 'Sans matériel' },
  'Crunch à la machine': { kind: 'kg', kg: 25, gear: 'Machine' },
  'Crunch à la poulie': { kind: 'kg', kg: 20, gear: 'Poulie haute' },
};

// Photos de démonstration (domaine public, github.com/yuhonas/free-exercise-db) : deux images par exercice,
// position de départ et position d'arrivée, rangées dans img/ex/.
const IMG = {
  "Squat": "Barbell_Squat", "Squat guidé": "Smith_Machine_Squat", "Presse à cuisses": "Leg_Press", "Hack squat": "Hack_Squat", "Goblet squat": "Goblet_Squat", "Squat au poids du corps": "Bodyweight_Squat", "Fentes bulgares": "Split_Squat_with_Dumbbells", "Fentes marchées": "Dumbbell_Lunges", "Step-up sur banc": "Dumbbell_Step_Ups", "Fentes au poids du corps": "Bodyweight_Walking_Lunge", "Soulevé de terre roumain": "Romanian_Deadlift", "Soulevé de terre roumain haltères": "Stiff-Legged_Dumbbell_Deadlift", "Hip thrust": "Barbell_Hip_Thrust", "Leg curl": "Seated_Leg_Curl", "Leg extension": "Leg_Extensions", "Adducteurs": "Thigh_Adductor", "Abducteurs": "Thigh_Abductor", "Mollets à la machine": "Standing_Calf_Raises", "Mollets haltères": "Standing_Dumbbell_Calf_Raise", "Pont fessier": "Butt_Lift_Bridge", "Soulevé de terre": "Barbell_Deadlift", "Soulevé de terre trap bar": "Trap_Bar_Deadlift", "Extensions lombaires": "Hyperextensions_Back_Extensions", "Développé couché": "Barbell_Bench_Press_-_Medium_Grip", "Développé couché haltères": "Dumbbell_Bench_Press", "Développé couché guidé": "Smith_Machine_Bench_Press", "Développé incliné haltères": "Incline_Dumbbell_Press", "Développé incliné barre": "Barbell_Incline_Bench_Press_-_Medium_Grip", "Presse pectoraux": "Machine_Bench_Press", "Butterfly": "Butterfly", "Écarté à la poulie": "Cable_Crossover", "Écarté haltères": "Dumbbell_Flyes", "Pompes": "Pushups", "Développé militaire haltères": "Dumbbell_Shoulder_Press", "Développé militaire barre": "Standing_Military_Press", "Presse épaules": "Machine_Shoulder_Military_Press", "Développé épaules guidé": "Smith_Machine_Overhead_Shoulder_Press", "Élévations latérales": "Side_Lateral_Raise", "Élévations latérales à la poulie": "Cable_Seated_Lateral_Raise", "Élévations latérales élastique": "Lateral_Raise_-_With_Bands", "Dips": "Dips_-_Triceps_Version", "Dips à la machine": "Dip_Machine", "Développé couché prise serrée": "Close-Grip_Barbell_Bench_Press", "Pompes diamant": "Push-Ups_-_Close_Triceps_Position", "Pompes prise serrée": "Push-Ups_-_Close_Triceps_Position", "Dips sur banc": "Bench_Dips", "Extensions triceps": "Triceps_Pushdown", "Extensions triceps à la machine": "Machine_Triceps_Extension", "Barre au front": "EZ-Bar_Skullcrusher", "Extension haltère nuque": "Standing_Dumbbell_Triceps_Extension", "Kickback haltère": "Tricep_Dumbbell_Kickback", "Tractions": "Pullups", "Tirage vertical": "Wide-Grip_Lat_Pulldown", "Tractions assistées": "Band_Assisted_Pull-Up", "Rowing inversé": "Inverted_Row", "Rowing aux sangles": "Suspended_Row", "Rowing sous une table": "Inverted_Row", "Rowing barre": "Bent_Over_Barbell_Row", "Rowing haltère un bras": "One-Arm_Dumbbell_Row", "Tirage horizontal": "Seated_Cable_Rows", "Rowing machine": "Leverage_Iso_Row", "Rowing T-bar": "T-Bar_Row_with_Handle", "Face pull": "Face_Pull", "Oiseau haltères": "Seated_Bent-Over_Rear_Delt_Raise", "Pec deck inversé": "Reverse_Machine_Flyes", "Tirage élastique": "Band_Pull_Apart", "Curl biceps": "Dumbbell_Bicep_Curl", "Curl marteau": "Hammer_Curls", "Curl barre EZ": "EZ-Bar_Curl", "Curl barre": "Barbell_Curl", "Curl poulie": "Standing_Biceps_Cable_Curl", "Curl au pupitre": "Machine_Preacher_Curls", "Curl incliné haltères": "Incline_Dumbbell_Curl", "Gainage": "Plank", "Gainage latéral": "Side_Bridge", "Dead bug": "Dead_Bug", "Relevés de jambes": "Flat_Bench_Lying_Leg_Raise", "Relevés de genoux à la chaise romaine": "Knee_Hip_Raise_On_Parallel_Bars", "Relevés de jambes suspendu": "Hanging_Leg_Raise", "Roue abdominale": "Ab_Roller", "Pallof press": "Pallof_Press", "Rotation russe": "Russian_Twist", "Crunch": "Crunches", "Crunch à la machine": "Ab_Crunch_Machine", "Crunch à la poulie": "Cable_Crunch", "Superman": "Superman"
};
const photo = id => (id ? [`./img/ex/${id}-0.jpg`, `./img/ex/${id}-1.jpg`] : null);
/** Les deux photos d'un exercice, ou null s'il n'en a pas. */
export const exPhotos = name => photo(IMG[name]);

// ── Matériel ──────────────────────────────────────────────────────────────────
export const EQUIPMENT = [
  { id: 'barre', label: 'Barre et disques', img: 'Barbell_Deadlift' },
  { id: 'rack', label: 'Cage à squat', img: 'Barbell_Squat' },
  { id: 'smith', label: 'Smith machine (barre guidée)', img: 'Smith_Machine_Squat' },
  { id: 'halteres', label: 'Haltères ou kettlebells', img: 'Dumbbell_Bicep_Curl' },
  { id: 'banc', label: 'Banc plat', img: 'Dumbbell_Bench_Press' },
  { id: 'banc_incline', label: 'Banc incliné', img: 'Incline_Dumbbell_Press' },
  { id: 'poulie', label: 'Poulie haute et basse', img: 'Triceps_Pushdown' },
  { id: 'crossover', label: 'Poulie vis-à-vis', img: 'Cable_Crossover' },
  { id: 'traction', label: 'Barre de traction', img: 'Pullups' },
  { id: 'dips', label: 'Barres à dips', img: 'Dips_-_Triceps_Version' },
  { id: 'chaise', label: 'Chaise romaine', img: 'Knee_Hip_Raise_On_Parallel_Bars' },
  { id: 'lombaires', label: 'Banc à lombaires', img: 'Hyperextensions_Back_Extensions' },
  { id: 'tbar', label: 'T-bar', img: 'T-Bar_Row_with_Handle' },
  { id: 'ez', label: 'Barre EZ', img: 'EZ-Bar_Curl' },
  { id: 'trap', label: 'Trap bar', img: 'Trap_Bar_Deadlift' },
  { id: 'trx', label: 'Sangles (TRX)', img: 'Suspended_Row' },
  { id: 'elastique', label: 'Élastiques', img: 'Band_Pull_Apart' },
  { id: 'roue', label: 'Roue abdominale', img: 'Ab_Roller' },
  { id: 'm_presse', label: 'Presse à cuisses', group: 'machine', img: 'Leg_Press' },
  { id: 'm_hack', label: 'Hack squat', group: 'machine', img: 'Hack_Squat' },
  { id: 'm_legext', label: 'Leg extension', group: 'machine', img: 'Leg_Extensions' },
  { id: 'm_legcurl', label: 'Leg curl', group: 'machine', img: 'Seated_Leg_Curl' },
  { id: 'm_adducteurs', label: 'Adducteurs', group: 'machine', img: 'Thigh_Adductor' },
  { id: 'm_abducteurs', label: 'Abducteurs', group: 'machine', img: 'Thigh_Abductor' },
  { id: 'm_mollets', label: 'Mollets', group: 'machine', img: 'Standing_Calf_Raises' },
  { id: 'm_pec', label: 'Presse pectoraux', group: 'machine', img: 'Machine_Bench_Press' },
  { id: 'm_pecdeck', label: 'Butterfly (pec deck)', group: 'machine', img: 'Butterfly' },
  { id: 'm_epaules', label: 'Presse épaules', group: 'machine', img: 'Machine_Shoulder_Military_Press' },
  { id: 'm_lat', label: 'Tirage vertical', group: 'machine', img: 'Wide-Grip_Lat_Pulldown' },
  { id: 'm_rowing', label: 'Tirage horizontal (rowing)', group: 'machine', img: 'Leverage_Iso_Row' },
  { id: 'm_assist', label: 'Tractions assistées', group: 'machine', img: 'Band_Assisted_Pull-Up' },
  { id: 'm_dips', label: 'Dips assis', group: 'machine', img: 'Dip_Machine' },
  { id: 'm_triceps', label: 'Extension triceps', group: 'machine', img: 'Machine_Triceps_Extension' },
  { id: 'm_biceps', label: 'Curl au pupitre', group: 'machine', img: 'Machine_Preacher_Curls' },
  { id: 'm_abdos', label: 'Crunch (abdos)', group: 'machine', img: 'Ab_Crunch_Machine' },
  { id: 'tapis', label: 'Tapis de course', group: 'cardio', img: 'Jogging_Treadmill' },
  { id: 'velo', label: 'Vélo', group: 'cardio', img: 'Bicycling_Stationary' },
  { id: 'rameur', label: 'Rameur', group: 'cardio', img: 'Rowing_Stationary' },
  { id: 'elliptique', label: 'Elliptique', group: 'cardio', img: 'Elliptical_Trainer' },
  { id: 'escalier', label: 'Escalier (stepper)', group: 'cardio', img: 'Stairmaster' },
].map(e => ({ group: 'libre', ...e, photo: photo(e.img)[0] }));

export const EQUIP_GROUPS = [{ id: 'libre', label: 'Matériel libre et postes' }, { id: 'machine', label: 'Machines guidées' }, { id: 'cardio', label: 'Cardio' }];

// Matériel nécessaire : chaque ligne est une liste de solutions possibles (il en suffit d'une).
const CABLE = [['poulie'], ['crossover']];
const NEED = {
  'Squat': [['barre', 'rack']], 'Squat guidé': [['smith']], 'Presse à cuisses': [['m_presse']], 'Hack squat': [['m_hack']], 'Goblet squat': [['halteres']],
  'Fentes bulgares': [['halteres', 'banc']], 'Fentes marchées': [['halteres']], 'Step-up sur banc': [['halteres', 'banc']],
  'Leg extension': [['m_legext']], 'Adducteurs': [['m_adducteurs']], 'Abducteurs': [['m_abducteurs']],
  'Mollets à la machine': [['m_mollets'], ['smith'], ['m_presse']], 'Mollets haltères': [['halteres']],
  'Soulevé de terre roumain': [['barre']], 'Soulevé de terre roumain haltères': [['halteres']], 'Hip thrust': [['barre', 'banc']],
  'Leg curl': [['m_legcurl']], 'Soulevé de terre': [['barre']], 'Soulevé de terre trap bar': [['trap']], 'Extensions lombaires': [['lombaires']],
  'Développé couché': [['barre', 'banc']], 'Développé couché haltères': [['halteres', 'banc']], 'Développé couché guidé': [['smith', 'banc']],
  'Développé incliné haltères': [['halteres', 'banc_incline']], 'Développé incliné barre': [['barre', 'banc_incline'], ['smith', 'banc_incline']],
  'Presse pectoraux': [['m_pec']], 'Butterfly': [['m_pecdeck']], 'Écarté à la poulie': [['crossover']], 'Écarté haltères': [['halteres', 'banc']],
  'Développé militaire haltères': [['halteres']], 'Développé militaire barre': [['barre']], 'Presse épaules': [['m_epaules']], 'Développé épaules guidé': [['smith', 'banc']],
  'Élévations latérales': [['halteres']], 'Élévations latérales à la poulie': CABLE, 'Élévations latérales élastique': [['elastique']],
  'Dips': [['dips'], ['chaise']], 'Dips à la machine': [['m_dips']], 'Développé couché prise serrée': [['barre', 'banc']], 'Dips sur banc': [['banc']],
  'Extensions triceps': CABLE, 'Extensions triceps à la machine': [['m_triceps']], 'Barre au front': [['ez', 'banc']], 'Extension haltère nuque': [['halteres']], 'Kickback haltère': [['halteres']],
  'Tractions': [['traction']], 'Tirage vertical': [['m_lat'], ['poulie'], ['crossover']], 'Tractions assistées': [['m_assist'], ['traction', 'elastique']],
  'Rowing inversé': [['smith'], ['rack', 'barre'], ['traction']], 'Rowing aux sangles': [['trx']],
  'Rowing barre': [['barre']], 'Rowing haltère un bras': [['halteres']], 'Tirage horizontal': [['poulie'], ['m_rowing']],
  'Rowing machine': [['m_rowing']], 'Rowing T-bar': [['tbar']], 'Face pull': CABLE, 'Oiseau haltères': [['halteres']], 'Pec deck inversé': [['m_pecdeck']],
  'Tirage élastique': [['elastique']], 'Rowing élastique': [['elastique']], 'Curl élastique': [['elastique']],
  'Curl biceps': [['halteres']], 'Curl marteau': [['halteres']], 'Curl barre EZ': [['ez']], 'Curl barre': [['barre']], 'Curl poulie': CABLE,
  'Curl au pupitre': [['m_biceps']], 'Curl incliné haltères': [['halteres', 'banc_incline']],
  'Relevés de genoux à la chaise romaine': [['chaise']], 'Relevés de jambes suspendu': [['traction']],
  'Roue abdominale': [['roue']], 'Pallof press': [['poulie'], ['crossover'], ['elastique']], 'Crunch à la machine': [['m_abdos']], 'Crunch à la poulie': CABLE,
};

export const PLACES = [{ id: 'salle', label: 'Ma salle' }, { id: 'maison', label: 'Maison' }];
export const defaultGear = () => ({ active: 'salle', salle: null, maison: ['halteres', 'elastique'] }); // null = tout le matériel

/** Matériel du lieu actif (null = tout est disponible). */
export const gearHas = db => { const g = db.gear || defaultGear(); return g[g.active] ?? null; };

/** Ce que tu peux utiliser pour le cardio final, selon ton matériel. */
export function cardioLabel(db) {
  const has = gearHas(db);
  const names = EQUIPMENT.filter(e => e.group === 'cardio' && (!has || has.includes(e.id))).map(e => e.label.toLowerCase().replace(' (stepper)', ''));
  if (!names.length) return 'corde à sauter, montées de genoux ou marche rapide';
  if (!has) return 'tapis, vélo ou rameur';
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} ou ${names[names.length - 1]}` : names[0];
}

/** L'exercice est-il faisable avec le matériel du lieu actif ? */
export function feasible(db, name) {
  const has = gearHas(db);
  const need = NEED[name];
  if (!has || !need) return true;
  return need.some(set => set.every(id => has.includes(id)));
}

// Programme tournant (une séance après l'autre sur tes jours d'entraînement).
// n = exercice d'origine, s = séries, alts = remplacements possibles.
// Cases du programme : l'exercice d'origine, puis ses remplacements (du plus proche au plus simple).
const SLOT = {
  'Squat': ['Presse à cuisses', 'Hack squat', 'Squat guidé', 'Goblet squat', 'Squat au poids du corps'],
  'Fentes bulgares': ['Fentes marchées', 'Step-up sur banc', 'Leg extension', 'Adducteurs', 'Abducteurs', 'Mollets à la machine', 'Mollets haltères', 'Fentes au poids du corps'],
  'Soulevé de terre roumain': ['Soulevé de terre roumain haltères', 'Hip thrust', 'Leg curl', 'Extensions lombaires', 'Pont fessier'],
  'Gainage': ['Dead bug', 'Relevés de jambes', 'Relevés de genoux à la chaise romaine', 'Relevés de jambes suspendu', 'Roue abdominale', 'Crunch', 'Crunch à la machine', 'Crunch à la poulie'],
  'Développé couché': ['Développé couché haltères', 'Développé couché guidé', 'Presse pectoraux', 'Développé incliné haltères', 'Développé incliné barre', 'Pompes'],
  'Développé militaire haltères': ['Développé militaire barre', 'Presse épaules', 'Développé épaules guidé', 'Élévations latérales', 'Pompes piquées'],
  'Dips': ['Dips à la machine', 'Développé couché prise serrée', 'Butterfly', 'Écarté à la poulie', 'Écarté haltères', 'Pompes diamant', 'Dips sur banc'],
  'Extensions triceps': ['Extensions triceps à la machine', 'Barre au front', 'Extension haltère nuque', 'Kickback haltère', 'Pompes prise serrée'],
  'Tractions': ['Tirage vertical', 'Tractions assistées', 'Rowing inversé', 'Rowing aux sangles', 'Rowing sous une table'],
  'Rowing barre': ['Rowing haltère un bras', 'Tirage horizontal', 'Rowing machine', 'Rowing T-bar', 'Rowing élastique', 'Superman'],
  'Face pull': ['Oiseau haltères', 'Pec deck inversé', 'Tirage élastique', 'Y-T-W au sol'],
  'Curl biceps': ['Curl marteau', 'Curl barre EZ', 'Curl barre', 'Curl poulie', 'Curl au pupitre', 'Curl incliné haltères', 'Curl élastique'],
  'Soulevé de terre': ['Soulevé de terre trap bar', 'Soulevé de terre roumain haltères', 'Hip thrust', 'Extensions lombaires', 'Pont fessier'],
  'Pompes': ['Développé couché haltères', 'Pompes sur les genoux', 'Presse pectoraux', 'Butterfly'],
  'Goblet squat': ['Presse à cuisses', 'Squat', 'Squat guidé', 'Leg extension', 'Fentes marchées', 'Squat au poids du corps'],
  'Gainage latéral': ['Pallof press', 'Rotation russe', 'Dead bug', 'Crunch'],
  // Cases en plus, quand tu choisis une séance plus longue
  'Leg extension': ['Adducteurs', 'Abducteurs', 'Fentes au poids du corps'],
  'Leg curl': ['Hip thrust', 'Extensions lombaires', 'Pont fessier'],
  'Mollets à la machine': ['Mollets haltères', 'Adducteurs', 'Abducteurs', 'Squat au poids du corps'],
  'Butterfly': ['Écarté à la poulie', 'Écarté haltères', 'Pompes'],
  'Développé incliné haltères': ['Développé incliné barre', 'Presse pectoraux', 'Pompes sur les genoux'],
  'Tirage horizontal': ['Rowing machine', 'Rowing haltère un bras', 'Rowing T-bar', 'Rowing élastique', 'Superman'],
  'Curl marteau': ['Curl barre EZ', 'Curl poulie', 'Curl au pupitre', 'Curl élastique'],
  'Extensions lombaires': ['Superman'],
  'Élévations latérales': ['Élévations latérales à la poulie', 'Élévations latérales élastique', 'Oiseau haltères', 'Y-T-W au sol', 'Pompes piquées'],
};
const slot = (n, s) => ({ n, s, alts: SLOT[n] });

export const SESSIONS = [
  { id: 'lower', name: 'Bas du corps', ex: [slot('Squat', 4), slot('Fentes bulgares', 3), slot('Soulevé de terre roumain', 3), slot('Gainage', 3)] },
  { id: 'push', name: 'Haut du corps · Poussée', ex: [slot('Développé couché', 4), slot('Développé militaire haltères', 3), slot('Dips', 3), slot('Extensions triceps', 3)] },
  { id: 'pull', name: 'Haut du corps · Tirage', ex: [slot('Tractions', 4), slot('Rowing barre', 3), slot('Face pull', 3), slot('Curl biceps', 3)] },
  { id: 'full', name: 'Full body', ex: [slot('Soulevé de terre', 4), slot('Pompes', 3), slot('Goblet squat', 3), slot('Gainage latéral', 3)] },
  // Hors rotation : à choisir quand tu en as envie
  { id: 'upper', name: 'Haut du corps complet', extra: true, ex: [slot('Développé couché', 3), slot('Tractions', 3), slot('Développé militaire haltères', 3), slot('Rowing barre', 3), slot('Élévations latérales', 3), slot('Curl biceps', 3)] },
];

// Exercices ajoutés, dans cet ordre, quand la durée choisie est plus longue que la séance de base.
const EXTRA = {
  lower: ['Leg extension', 'Leg curl', 'Mollets à la machine', 'Gainage latéral'],
  push: ['Développé incliné haltères', 'Butterfly', 'Élévations latérales', 'Gainage'],
  pull: ['Tirage horizontal', 'Extensions lombaires', 'Curl marteau', 'Gainage'],
  full: ['Rowing barre', 'Développé militaire haltères', 'Fentes bulgares', 'Curl biceps'],
  upper: ['Extensions triceps', 'Face pull', 'Butterfly', 'Gainage'],
};
export const DURATIONS = [20, 30, 40, 45, 50, 60, 75, 90];

// Ordre du programme. Les séances « extra » ne tournent pas : elles se choisissent à la main.
export const ROTATION = ['lower', 'push', 'pull', 'full'];
export const sessionById = id => SESSIONS.find(x => x.id === id) || null;
/** Séance prévue par le programme, n séances plus loin. */
export const rotationSession = (db, n = 0) => sessionById(ROTATION[((db.sessIdx || 0) + n) % ROTATION.length]);


// Activités hors programme (valeurs MET du Compendium of Physical Activities).
export const ACTIVITIES = [
  { id: 'tennis', label: 'Tennis', met: 7.3 },
  { id: 'renfo', label: 'Body Pump / renfo', met: 6 },
  { id: 'course', label: 'Course à pied', met: 9.8 },
  { id: 'velo', label: 'Vélo', met: 7.5 },
  { id: 'marche', label: 'Marche', met: 3.5 },
  { id: 'natation', label: 'Natation', met: 7 },
  { id: 'muscu', label: 'Musculation libre', met: 5 },
  { id: 'autre', label: 'Autre', met: 5 },
];

export const metKcal = (met, kg, minutes) => Math.round((met * kg * Math.max(0, minutes)) / 60);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const roundKg = v => Math.max(0, Math.round(v * 4) / 4);
export const fmtKg = v => String(roundKg(v)).replace('.', ',');

export const exInfo = name => EXERCISES[name] || { kind: 'kg', kg: 10, gear: '' };
export const stepChoices = name => (exInfo(name).heavy ? [1, 2.5, 5, 10] : [0.5, 1, 2.5]);
export const progressStep = name => (exInfo(name).heavy ? 2.5 : 1);
export const defaultStep = name => (exInfo(name).heavy ? 2.5 : 1);

/** Charge / répétitions / secondes prévues pour la prochaine séance de cet exercice. */
export function currentTarget(db, name) {
  const e = exInfo(name);
  const p = (db.progress && db.progress[name]) || {};
  return { kg: p.kg ?? e.kg ?? 0, reps: p.reps ?? e.reps ?? 0, sec: p.sec ?? e.sec ?? 0 };
}

/**
 * Exercice retenu pour une case du programme : ton remplacement s'il existe, sinon l'exercice d'origine.
 * S'il n'est pas faisable avec ton matériel, on prend la première alternative faisable (et pas déjà dans la séance).
 */
export function slotName(db, slot, overrides = {}, used = null) {
  if (overrides[slot.n]) return overrides[slot.n];
  const wanted = (db.swaps && db.swaps[slot.n]) || slot.n;
  const free = n => !used || !used.has(n);
  if (feasible(db, wanted) && free(wanted)) return wanted;
  return [slot.n, ...slot.alts].find(n => feasible(db, n) && free(n)) || wanted;
}

export const RATINGS = [
  { id: 'facile', label: 'Facile' },
  { id: 'bien', label: 'Bien' },
  { id: 'dur', label: 'Difficile' },
];

/**
 * Progression : à partir de ce que tu viens de faire et de ton ressenti.
 * - Facile → on monte d'un cran dès la prochaine fois.
 * - Bien → on monte d'un cran si la fois d'avant, à la même charge, était déjà « Bien » ou « Facile ».
 * - Difficile → on garde ; deux fois « Difficile » à la même charge → on redescend d'un cran.
 */
const sameWork = (a, b) => !!a && !!b && (a.kg || 0) === (b.kg || 0) && (a.reps || 0) === (b.reps || 0) && (a.sec || 0) === (b.sec || 0);

export function nextTarget(name, entry, prev) {
  const e = exInfo(name);
  const r = entry.rating || 'bien';
  const same = sameWork(entry, prev);
  let dir = 0;
  if (r === 'facile') dir = 1;
  else if (r === 'bien' && same && (prev.rating === 'bien' || prev.rating === 'facile')) dir = 1;
  else if (r === 'dur' && same && prev.rating === 'dur') dir = -1;
  if (entry.miss && dir > 0) dir = 0; // des répétitions ont manqué : on ne monte pas
  if (e.kind === 'kg') return { dir, kg: roundKg(entry.kg + dir * progressStep(name)) };
  if (e.kind === 'bw') return { dir, reps: Math.max(3, entry.reps + dir * (r === 'facile' ? 2 : 1)) };
  return { dir, sec: Math.max(15, entry.sec + dir * (r === 'facile' ? 10 : 5)) };
}

/** Recalcule la cible d'un exercice à partir de son historique (après une séance ou un ressenti modifié). */
export function recompute(p, name) {
  const h = p.hist || [];
  if (!h.length) return;
  const n = nextTarget(name, h[h.length - 1], h.length > 1 ? h[h.length - 2] : null);
  delete n.dir;
  Object.assign(p, n);
}

/**
 * Bilan des 3 derniers jours (avant-hier, hier, aujourd'hui) par rapport à la cible.
 * - Un jour sans repas noté, ou à peine rempli (moins de la moitié du métabolisme de base), est ignoré :
 *   sinon un oubli compterait comme un gros manque.
 * - Aujourd'hui ne compte qu'en excédent tant que la journée n'est pas finie.
 * extra = calories d'un repas pas encore ajouté (pour prévisualiser son effet).
 */
export function balance(db, ref = todayKey(), extra = 0) {
  const target = targetFor(db.profile);
  const minEaten = bmr(db.profile) * 0.5;
  const days = [-2, -1].map(off => {
    const k = addDays(ref, off);
    const t = dayTotals(getDay(db, k));
    const counted = t.hasFood && t.eaten >= minEaten;
    return { k, counted, partial: t.hasFood && !counted, v: counted ? t.eaten - t.burned - target : 0 };
  });
  const t = dayTotals(getDay(db, ref));
  const raw = t.eaten + extra - t.burned - target;
  const today = { k: ref, counted: true, live: true, raw, v: Math.max(0, raw) };
  const sum = days.reduce((s, d) => s + d.v, 0) + today.v;
  const steps = clamp(Math.trunc(sum / STEP_KCAL), -MAX_STEPS, MAX_STEPS);
  return { days: [...days, today], sum, steps, pct: steps * STEP_PCT, target };
}

/** La prochaine séance : celle que tu as choisie à la main, sinon celle du programme. */
export function currentSession(db) {
  return (db.choice && sessionById(db.choice)) || rotationSession(db);
}

/** Les n prochaines séances : jour et contenu. Un choix à la main ne décale pas le programme. */
export function upcoming(db, n = 5, ref = todayKey()) {
  const days = db.profile?.days?.length ? db.profile.days : [0, 2, 4];
  const out = [];
  let k = nextTrainingDay(db, ref);
  const chosen = !!(db.choice && sessionById(db.choice) && db.choice !== rotationSession(db).id);
  for (let i = 0; i < n; i++) {
    out.push({ k, session: i === 0 ? currentSession(db) : rotationSession(db, chosen ? i - 1 : i) });
    let next = addDays(k, 1);
    for (let j = 0; j < 8 && !days.includes(weekday(next)); j++) next = addDays(next, 1);
    k = next;
  }
  return out;
}

// Prochain jour d'entraînement (aujourd'hui inclus si aucune séance n'y a été faite).
export function nextTrainingDay(db, ref = todayKey()) {
  const days = db.profile?.days?.length ? db.profile.days : [0, 2, 4];
  const doneToday = db.sessions.some(s => s.date === ref);
  for (let i = doneToday ? 1 : 0; i < 8; i++) {
    const k = addDays(ref, i);
    if (days.includes(weekday(k))) return k;
  }
  return addDays(ref, 1);
}

/** Une ligne d'exercice prête pour la séance. */
export function exerciseEntry(db, slot, name, goal, d) {
  const G = GOALS[goal] || GOALS.maintien;
  const info = exInfo(name);
  const t = currentTarget(db, name);
  return {
    slot: slot.n, name, kind: info.kind, sets: slot.s + d, base: slot.s, d,
    reps: info.kind === 'kg' ? G.reps : info.kind === 'bw' ? t.reps : 0,
    sec: info.kind === 'sec' ? t.sec : 0,
    kg: info.kind === 'kg' ? t.kg : 0,
    heavy: !!info.heavy, per: !!info.per, side: !!info.side, gear: info.gear || '',
    rest: (db.progress && db.progress[name] && db.progress[name].rest) || 0, // repos choisi pour cet exercice (0 = automatique)
    nogear: !feasible(db, name),
    alts: [slot.n, ...slot.alts],
  };
}

const SET_SEC = 45; // durée moyenne d'une série

// Durée estimée, en minutes. « paired » = nombre de supersets, formés à partir de la fin de la séance :
// deux exercices enchaînés sans repos, un seul repos par tour.
function estimate(items, rest, fin, paired) {
  const solo = items.length - paired * 2;
  let sec = 0;
  items.forEach((it, i) => {
    sec += it.s * SET_SEC;
    if (i < solo) sec += it.s * rest;
    else if ((i - solo) % 2 === 1) sec += Math.max(it.s, items[i - 1].s) * rest;
  });
  return WARM + sec / 60 + fin;
}

/**
 * Ajuste la séance de base à la durée voulue (en minutes), à 2 min près quand c'est possible.
 * Trop longue : supersets d'abord, puis repos plus courts, moins de cardio, moins de séries, moins d'exercices.
 * Trop courte : exercices en plus, puis séries en plus, puis un peu plus de cardio.
 */
function fitTo(T, session, G) {
  let items = session.ex.map(sl => ({ slot: sl, s: sl.s }));
  let rest = 90;
  let fin = G.fin;
  let paired = 0;
  const est = () => estimate(items, rest, fin, paired);
  const maxPairs = () => Math.floor((items.length - 1) / 2); // le premier exercice reste toujours seul
  const TOL = 2;
  if (T && est() > T + TOL) {
    while (est() > T + TOL && paired < maxPairs()) paired += 1;
    if (est() > T + TOL) rest = 60;
    while (est() > T + TOL && fin > 0) fin = Math.max(0, fin - 3);
    for (let pass = 0; pass < 3; pass++) for (let i = items.length - 1; i >= 0 && est() > T + TOL; i--) if (items[i].s > 2) items[i].s -= 1;
    while (est() > T + TOL && items.length > 2) { items.pop(); paired = Math.min(paired, maxPairs()); }
  } else if (T && est() < T - TOL) {
    for (const n of EXTRA[session.id] || []) {
      if (est() >= T - TOL) break;
      items.push({ slot: slot(n, 3), s: 3, extra: true });
      if (est() > T + TOL) { items.pop(); break; }
    }
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < items.length && est() < T - TOL; i++) {
      if (items[i].s >= 5) continue;
      items[i].s += 1;
      if (est() > T + TOL) items[i].s -= 1;
    }
    while (G.fin > 0 && est() < T - TOL && fin < G.fin + 9) fin += 3;
  }
  return { items, rest, fin, paired };
}

/** Durée réelle du plan, avec tes repos personnalisés. */
function planMinutes(ex, rest, fin) {
  let sec = 0;
  ex.forEach((e, i) => {
    sec += e.sets * SET_SEC;
    const mate = ex[i + 1];
    if (e.ss != null && mate && mate.ss === e.ss) return; // premier d'un superset : pas de repos après lui
    const first = e.ss != null && i > 0 && ex[i - 1].ss === e.ss ? ex[i - 1] : null;
    sec += (first ? Math.max(e.sets, first.sets) : e.sets) * (e.rest || rest);
  });
  return Math.round(WARM + sec / 60 + fin);
}

/**
 * Construit la séance : d'abord ajustée à la durée choisie (opts.minutes, sinon la séance de base),
 * puis renforcée ou allégée selon le bilan des repas (steps de -4 à +4).
 */
export function buildPlan(session, goal, steps, db, overrides = {}, opts = {}) {
  const G = GOALS[goal] || GOALS.maintien;
  const T = opts.minutes === undefined ? (db.profile && db.profile.sessionMin) || 0 : opts.minutes || 0;
  const F = fitTo(T, session, G);
  const used = new Set();
  const solo = F.items.length - F.paired * 2;
  const ex = F.items.map((it, i) => {
    let d = 0;
    if (steps > 0 && (goal === 'prise' ? i < steps : steps >= 2 && i < 2)) d = 1;
    if (steps < 0 && it.s > 1 && ((steps <= -2 && i > 0) || (steps <= -4 && i === 0))) d = -1;
    const sl = { ...it.slot, s: it.s };
    const name = slotName(db, sl, overrides, used);
    used.add(name);
    const e = exerciseEntry(db, sl, name, goal, d);
    if (i >= solo) e.ss = Math.floor((i - solo) / 2); // numéro du superset
    if (it.extra) e.extra = true;
    return e;
  });
  const finBase = F.fin;
  let fin = finBase;
  if (steps > 0 && goal !== 'prise') fin += steps * 3;
  if (steps < 0) fin = 0;
  const restBase = F.rest;
  let rest = restBase;
  if (steps >= 3 && goal !== 'prise') rest = Math.min(rest, 60);
  if (steps < 0) rest += 30;
  return {
    session: { id: session.id, name: session.name }, goal, steps, pct: steps * STEP_PCT, ex, fin, finBase, rest, restBase,
    minutes: planMinutes(ex, rest, fin), target: T, supersets: F.paired, cardio: cardioLabel(db),
    added: ex.filter(e => e.d > 0).length, removed: ex.filter(e => e.d < 0).length,
  };
}

/** Repos après une série de cet exercice : ton réglage, sinon celui de la séance. */
export const restFor = (plan, e) => (e && e.rest) || plan.rest;

export function planKcal(plan, weightKg) {
  const strengthMin = plan.minutes - plan.fin - WARM;
  return metKcal(4, weightKg, WARM) + metKcal(5, weightKg, strengthMin) + metKcal(8, weightKg, plan.fin);
}

export function workLabel(e) {
  if (e.kind === 'sec') return `${e.sec} s${e.side ? ' par côté' : ''}`;
  if (e.kind === 'bw') return `${e.reps} reps${e.side ? ' par jambe' : ''} · poids du corps`;
  return `${e.reps} reps · ${fmtKg(e.kg)} kg${e.per ? ' par main' : ''}`;
}

export const specOf = e => `${e.sets} × ${workLabel(e)}`;

export function summary(plan) {
  const parts = [];
  if (plan.added) parts.push(`${plan.added} série${plan.added > 1 ? 's' : ''} en plus`);
  if (plan.removed) parts.push(`${plan.removed} série${plan.removed > 1 ? 's' : ''} en moins`);
  if (plan.fin > plan.finBase) parts.push(plan.finBase ? `cardio final de ${plan.fin} min au lieu de ${plan.finBase}` : `cardio final de ${plan.fin} min`);
  if (plan.fin < plan.finBase) parts.push('sans cardio final');
  const rb = plan.restBase || 90;
  if (plan.rest !== rb) parts.push(plan.rest < rb ? 'repos plus courts' : 'repos plus longs');
  if (parts.length < 2) return parts[0] || '';
  return parts.slice(0, -1).join(', ') + ' et ' + parts[parts.length - 1];
}

/** Déroulé pas à pas pour le lecteur de séance. block = index du bloc (échauffement, exercices, cardio). */
export function sequence(plan) {
  const out = [{ kind: 'timed', block: 0, name: 'Échauffement', min: WARM, sub: `${WARM} min · mobilité et cardio léger` }];
  const set = (idx, i, extra) => out.push({ kind: 'set', block: idx + 1, ex: idx, name: plan.ex[idx].name, i, n: plan.ex[idx].sets, ...extra });
  for (let idx = 0; idx < plan.ex.length; idx++) {
    const e = plan.ex[idx];
    const mate = plan.ex[idx + 1];
    if (e.ss != null && mate && mate.ss === e.ss) {
      // superset : A1, B1, repos, A2, B2, repos…
      for (let r = 1; r <= Math.max(e.sets, mate.sets); r++) {
        if (r <= e.sets) set(idx, r, { ss: 'a', mate: mate.name, chain: r <= mate.sets });
        if (r <= mate.sets) set(idx + 1, r, { ss: 'b', mate: e.name });
      }
      idx += 1;
    } else {
      for (let i = 1; i <= e.sets; i++) set(idx, i);
    }
  }
  if (plan.fin) out.push({ kind: 'timed', block: plan.ex.length + 1, name: 'Cardio final', min: plan.fin, sub: `${plan.fin} min · ${plan.cardio || 'vélo ou rameur'}`, finisher: true });
  return out;
}
export function blocks(plan) {
  return ['Échauffement', ...plan.ex.map(e => e.name), ...(plan.fin ? ['Cardio final'] : [])];
}

// Séance laissée en plan : plus de 30 min sans aucune action de ta part.
export const STALE_MS = 30 * 60000;
export const isStale = (w, now) => !!w && now - (w.lastAt || w.startedAt) > STALE_MS;
