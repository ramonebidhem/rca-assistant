import { PrismaClient, type StepType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import path from 'node:path';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Knowledge base — wire-processing defects for automatic cut/strip/crimp lines
// (Komax / Schleuniger) grounded in IPC/WHMA-A-620 acceptance criteria and
// crimp-force-monitoring (Komax ACO / Schleuniger CFA) practice.
// ---------------------------------------------------------------------------

interface RootCauseSeed {
  title: string;
  description: string;
  steps: string[];
  checks: string[];
}
interface FailureTypeSeed {
  name: string;
  description: string;
  rootCauses: RootCauseSeed[];
}
interface CategorySeed {
  name: string;
  description: string;
  color: string;
  failureTypes: FailureTypeSeed[];
}

const DATA: CategorySeed[] = [
  {
    name: 'Crimping',
    color: '#1450E0',
    description:
      'Terminal crimping defects on automatic and benchtop crimping presses (Komax / Schleuniger). Detected by crimp-force monitoring (ACO / CFA) and cross-section (micrograph) analysis, judged against IPC/WHMA-A-620.',
    failureTypes: [
      {
        name: 'Strands out of the crimp',
        description:
          'One or more conductor strands are not enclosed by the wire barrel and lie outside the crimp.',
        rootCauses: [
          {
            title: 'Swivel arm / wire guide position not well defined',
            description:
              'The wire-transfer swivel arm or guide feeds the conductor off-centre into the applicator, so strands fall outside the wire barrel.',
            steps: [
              'Reset the swivel arm / wire guide to the reference position on the applicator setup sheet.',
              'Run three test crimps and cross-section one to confirm all strands are enclosed.',
            ],
            checks: ['Confirm no loose strands are visible outside the wire barrel under magnification.'],
          },
          {
            title: 'Conductor brush splays after stripping (birdcage)',
            description:
              'Strands splay open (birdcage) after stripping and spread beyond the barrel during insertion.',
            steps: [
              'Reduce the stripping blade opening or add a strand-align / straightener device.',
              'Enable wire-end detection and re-run the transfer.',
            ],
            checks: ['Verify strands stay bundled at the moment of insertion.'],
          },
          {
            title: 'Terminal not centred in the applicator',
            description:
              'The terminal is off-centre on the anvil, shifting the barrel away from the conductor.',
            steps: [
              'Centre the terminal track and anvil to the applicator centreline.',
              'Perform a test crimp and inspect strand capture.',
            ],
            checks: ['Check terminal centring on the anvil under magnification.'],
          },
          {
            title: 'Strip length too short for the wire barrel',
            description:
              'The stripped conductor is shorter than the wire barrel, so the last strands are not gripped.',
            steps: [
              'Increase strip length to match the barrel per the crimp specification.',
              'Re-measure conductor brush and barrel coverage.',
            ],
            checks: ['Confirm the conductor fills the full length of the wire barrel.'],
          },
        ],
      },
      {
        name: 'Strands on the crimp',
        description:
          'Loose strands (whiskers) lie on top of the insulation crimp or between the wire and insulation barrels, risking shorts.',
        rootCauses: [
          {
            title: 'Strip length too long',
            description:
              'Excess bared conductor reaches into the insulation crimp zone, leaving strands on top of the crimp.',
            steps: [
              'Reduce strip length to the crimp specification.',
              'Verify the brush transition between conductor and insulation crimp.',
            ],
            checks: ['Confirm no strands lie over the insulation barrel.'],
          },
          {
            title: 'Stray strands from damaged stripping blades',
            description: 'Worn stripping blades shear individual strands that then lie on the crimp.',
            steps: [
              'Inspect and replace the stripping blades.',
              'Clean the strip station and re-run.',
            ],
            checks: ['Verify the strand count is complete and no stray strands remain.'],
          },
          {
            title: 'Poor wire transfer alignment',
            description: 'The conductor is presented off-axis, so stray strands fold onto the crimp.',
            steps: ['Re-align the gripper / transfer to the applicator.', 'Test-crimp and inspect.'],
            checks: ['Check the conductor sits central before crimping.'],
          },
        ],
      },
      {
        name: 'Crimp height out of specification',
        description:
          'Measured conductor crimp height is outside the tolerance band, affecting mechanical and electrical integrity.',
        rootCauses: [
          {
            title: 'Applicator wear / beyond maintenance interval',
            description:
              'A worn applicator produces progressively shallow or inconsistent crimp heights across a run.',
            steps: [
              'Replace or service the applicator crimp tooling per the maintenance schedule.',
              'Recalibrate crimp height to the spec sheet and log the reading.',
            ],
            checks: ['Measure crimp height on 5 pieces and confirm all are within tolerance.'],
          },
          {
            title: 'Wrong shut height / press setup',
            description:
              'The press shut height is set incorrectly for the terminal, giving over- or under-compression.',
            steps: [
              'Set the press shut height to the applicator reference value.',
              'Run a crimp-height and pull-force check.',
            ],
            checks: ['Confirm crimp height and pull force meet the spec.'],
          },
          {
            title: 'Wrong terminal or wire size for the applicator',
            description: 'A terminal/wire combination outside the applicator range yields out-of-spec height.',
            steps: [
              'Verify the terminal part number and wire cross-section against the crimp chart.',
              'Load the correct applicator / wire and re-test.',
            ],
            checks: ['Confirm terminal PN and wire CSA match the crimp chart.'],
          },
          {
            title: 'Crimp-force monitor not taught or disabled',
            description: 'The CFM reference (ACO / CFA) is not taught, so height drift is not caught.',
            steps: [
              'Re-teach the crimp-force reference on verified good samples.',
              'Enable automatic reject for out-of-band curves.',
            ],
            checks: ['Confirm the crimp-force monitor is active and the envelope is taught.'],
          },
        ],
      },
      {
        name: 'Bellmouth non-conform',
        description:
          'The flare (bellmouth) at the wire-barrel ends is missing, too small, or excessive at the front or rear.',
        rootCauses: [
          {
            title: 'Worn or damaged crimp tooling',
            description: 'Worn anvil / crimper edges fail to form a proper bellmouth.',
            steps: [
              'Inspect the anvil and crimper radius; replace if worn.',
              'Test-crimp and inspect front and rear bellmouth.',
            ],
            checks: ['Confirm a symmetric bellmouth is present at both barrel ends.'],
          },
          {
            title: 'Incorrect conductor positioning in the barrel',
            description: 'The conductor set too far forward or back changes bellmouth formation.',
            steps: ['Adjust the wire stop / conductor position in the barrel.', 'Re-crimp and inspect.'],
            checks: ['Confirm brush and bellmouth are within the inspection window.'],
          },
          {
            title: 'Crimp height too high (under-compression)',
            description: 'Under-compression leaves an oversized or irregular bellmouth.',
            steps: ['Correct crimp height to spec.', 'Re-inspect the bellmouth form.'],
            checks: ['Confirm bellmouth size is within acceptance criteria.'],
          },
        ],
      },
      {
        name: 'Insufficient conductor brush',
        description:
          'The conductor brush (strands visible beyond the wire barrel) is too short or not visible, per IPC/WHMA-A-620.',
        rootCauses: [
          {
            title: 'Strip length too short',
            description: 'Too little conductor is exposed, so no brush is visible beyond the barrel.',
            steps: [
              'Increase strip length so the brush is visible beyond the wire barrel.',
              'Re-measure brush length.',
            ],
            checks: ['Confirm the brush is visible and within min/max.'],
          },
          {
            title: 'Wire set too far into the barrel',
            description: 'The conductor is inserted too deep, hiding the brush inside the barrel.',
            steps: ['Adjust the wire stop so the conductor extends past the barrel.', 'Test-crimp and inspect.'],
            checks: ['Confirm the conductor extends beyond the wire barrel.'],
          },
        ],
      },
      {
        name: 'Insulation in the conductor crimp',
        description:
          'Insulation is caught inside the wire (conductor) barrel, reducing electrical contact and pull force.',
        rootCauses: [
          {
            title: 'Strip length too short',
            description: 'Insulation reaches into the conductor barrel because too little was stripped.',
            steps: [
              'Increase strip length to clear insulation from the wire barrel.',
              'Re-crimp and cross-section to verify.',
            ],
            checks: ['Confirm no insulation inside the conductor barrel.'],
          },
          {
            title: 'Insulation not fully removed at strip',
            description: 'A residual insulation slug is carried into the crimp.',
            steps: [
              'Correct blade depth / position to fully remove the insulation slug.',
              'Verify clean conductor at the strip station.',
            ],
            checks: ['Confirm the conductor is clean before crimp.'],
          },
          {
            title: 'Wire positioned too far back',
            description: 'The wire stop leaves insulation inside the conductor barrel.',
            steps: [
              'Adjust the wire stop / transfer so insulation stays in the insulation barrel.',
              'Re-test.',
            ],
            checks: ['Confirm insulation sits only in the insulation crimp.'],
          },
        ],
      },
      {
        name: 'Insulation crimp grip out of tolerance',
        description:
          'The insulation (support) crimp is too loose (no strain relief) or too tight (cuts the insulation).',
        rootCauses: [
          {
            title: 'Wrong insulation crimp height / tooling',
            description: 'The insulation crimp height does not match the wire outer diameter.',
            steps: [
              'Set the insulation crimp height for the wire OD per spec.',
              'Verify grip with a wiggle / pull check.',
            ],
            checks: ['Confirm insulation is held without cutting through.'],
          },
          {
            title: 'Wire outer diameter out of range',
            description: 'The wire OD is outside the applicator window, so grip is loose or over-tight.',
            steps: [
              'Verify wire OD / insulation against the applicator range.',
              'Select the correct applicator or insulation crimp setting.',
            ],
            checks: ['Confirm wire OD within the applicator window.'],
          },
        ],
      },
      {
        name: 'Terminal deformation',
        description:
          'The terminal is bent, twisted, rolled, or the contact / box section is deformed after crimping.',
        rootCauses: [
          {
            title: 'Terminal feed / carrier not correctly aligned',
            description: 'Misaligned feed or cut-off distorts the terminal during crimp.',
            steps: [
              'Align the terminal feed and cut-off to the applicator.',
              'Inspect the box / contact section after crimp.',
            ],
            checks: ['Confirm the contact section is straight and undamaged.'],
          },
          {
            title: 'Excessive crimp force / wrong shut height',
            description: 'Over-compression deforms the contact area.',
            steps: ['Correct shut height and crimp force to spec.', 'Re-crimp and inspect for deformation.'],
            checks: ['Confirm no deformation of the contact area.'],
          },
          {
            title: 'Cut-off tab burr pushing the terminal',
            description: 'A burr on the carrier cut-off tab pushes and bends the terminal.',
            steps: [
              'Adjust the cut-off blade to remove the burr and correct tab length.',
              'Inspect the terminal after cut-off.',
            ],
            checks: ['Confirm cut-off tab length and no burr.'],
          },
        ],
      },
      {
        name: 'Crimp force curve out of tolerance',
        description:
          'The crimp-force monitor (Komax ACO / Schleuniger CFA) flags the crimp-force curve outside the taught envelope.',
        rootCauses: [
          {
            title: 'Missing strands / short brush',
            description: 'Fewer strands or a short brush lower the crimp force below the envelope.',
            steps: [
              'Check upstream stripping for cut or missing strands.',
              'Correct the strip and re-teach if needed.',
            ],
            checks: ['Confirm the full strand count enters the barrel.'],
          },
          {
            title: 'Terminal or wire material variation',
            description: 'A new terminal or wire lot shifts the force curve out of the taught band.',
            steps: [
              'Verify the terminal lot and wire; re-teach the CFM reference on the new lot.',
              'Confirm the curve returns within envelope.',
            ],
            checks: ['Confirm the CFM curve is inside the taught band.'],
          },
          {
            title: 'Reference envelope taught on bad samples',
            description: 'The CFM was taught on defective crimps, so the envelope is invalid.',
            steps: [
              'Re-teach the CFM using verified good crimps (cross-sectioned).',
              'Validate with known-good and known-bad pieces.',
            ],
            checks: ['Confirm good pieces pass and defects are rejected.'],
          },
        ],
      },
    ],
  },
  {
    name: 'Seal',
    color: '#17843F',
    description:
      'Single-wire seal (grommet) defects on seal-crimp modules — sealing integrity for sealed connector cavities, per IPC/WHMA-A-620 and seal pull-force requirements.',
    failureTypes: [
      {
        name: 'Missing seal',
        description: 'No single-wire seal is present on the wire before the seal crimp.',
        rootCauses: [
          {
            title: 'Seal feeder empty or jammed',
            description: 'The seal feeder (bowl / tape) is empty or jammed, so no seal is loaded.',
            steps: [
              'Refill or clear the seal feeder and re-home the module.',
              'Run a test cycle and confirm seal pick-up.',
            ],
            checks: ['Confirm a seal is present on every wire.'],
          },
          {
            title: 'Seal-presence sensor disabled or misaligned',
            description: 'The seal detection sensor is off or misaligned, so no-seal parts pass.',
            steps: [
              'Enable and align the seal-presence sensor.',
              'Verify it rejects a deliberately no-seal part.',
            ],
            checks: ['Confirm the sensor detects a missing seal.'],
          },
        ],
      },
      {
        name: 'Seal damaged',
        description: 'The seal is cut, torn, or nicked, compromising the sealing lips.',
        rootCauses: [
          {
            title: 'Worn or sharp seal transfer tooling',
            description: 'Worn seal-loading fingers or tooling cut the seal body during handling.',
            steps: [
              'Inspect and replace the seal-loading fingers / tooling.',
              'Run test pieces and inspect the seal body.',
            ],
            checks: ['Confirm the seal lips are intact and undamaged.'],
          },
          {
            title: 'Seal crimp height too tight',
            description: 'An over-tight seal crimp cuts or tears the elastic seal.',
            steps: ['Increase the seal crimp height to the spec.', 'Inspect for cuts after crimp.'],
            checks: ['Confirm no cuts or tears on the seal.'],
          },
          {
            title: 'Wire strand pierces the seal during insertion',
            description: 'A splayed strand punctures the seal bore as the wire is inserted.',
            steps: [
              'Improve conductor alignment / add a lead-in; check for splayed strands.',
              'Re-run and inspect the seal bore.',
            ],
            checks: ['Confirm the seal bore is not pierced.'],
          },
        ],
      },
      {
        name: 'Seal position out of tolerance',
        description: 'The seal sits too far forward or back on the wire relative to the terminal.',
        rootCauses: [
          {
            title: 'Seal stop / positioning incorrectly set',
            description: 'The seal position stop is set to the wrong dimension.',
            steps: [
              'Set the seal position stop to the spec dimension.',
              'Measure seal-to-terminal distance on test pieces.',
            ],
            checks: ['Confirm the seal position is within tolerance.'],
          },
          {
            title: 'Strip / cut length variation upstream',
            description: 'Inconsistent cut or strip length shifts the seal position.',
            steps: [
              'Verify cut and strip lengths feeding the seal module.',
              'Correct and re-measure the seal position.',
            ],
            checks: ['Confirm consistent seal position across samples.'],
          },
        ],
      },
      {
        name: 'Seal deformed by crimp',
        description:
          'The elastic seal is severely deformed by the insulation / seal crimp, impairing sealing and pull force.',
        rootCauses: [
          {
            title: 'Seal crimp height too low (over-crimped)',
            description: 'Excessive compression permanently deforms the seal.',
            steps: [
              'Raise the seal crimp height to the specified value.',
              'Re-crimp and check seal geometry and pull force.',
            ],
            checks: ['Confirm the seal returns to shape and meets pull force.'],
          },
          {
            title: 'Wrong seal size for the wire',
            description: 'A seal too small for the wire is crushed during crimp.',
            steps: ['Verify the seal PN / size against the wire OD.', 'Load the correct seal and re-test.'],
            checks: ['Confirm the seal PN matches the wire.'],
          },
        ],
      },
      {
        name: 'Wrong seal type or size',
        description: 'A seal of the wrong colour / size / part number is fitted for the wire cross-section.',
        rootCauses: [
          {
            title: 'Wrong seal loaded in the feeder',
            description: 'The feeder was loaded with a seal that does not match the work order.',
            steps: [
              'Verify the seal part number against the work order.',
              'Reload the correct seal and purge wrong parts.',
            ],
            checks: ['Confirm the seal PN and colour match the spec.'],
          },
        ],
      },
      {
        name: 'Seal not fully seated on the wire',
        description: 'The seal is only partially pushed onto the wire; it can move or leak.',
        rootCauses: [
          {
            title: 'Insufficient seal insertion stroke',
            description: 'The insertion stroke / force does not fully seat the seal.',
            steps: [
              'Adjust the seal insertion stroke / force to fully seat the seal.',
              'Verify seal seating on test pieces.',
            ],
            checks: ['Confirm the seal is fully seated against the reference.'],
          },
          {
            title: 'Wire OD too large / seal bore too small',
            description: 'Incompatible wire OD and seal bore prevent full seating.',
            steps: ['Verify wire OD and seal bore compatibility.', 'Select the correct seal.'],
            checks: ['Confirm the seal slides on and seats without a gap.'],
          },
        ],
      },
      {
        name: 'Double seal or seal skew',
        description: 'Two seals are loaded, or the seal is cocked / skewed on the wire.',
        rootCauses: [
          {
            title: 'Feeder singulation fault',
            description: 'The seal escapement / singulation picks two seals or presents one skewed.',
            steps: [
              'Service the seal singulation / escapement in the feeder.',
              'Run test cycles to confirm a single-seal pick.',
            ],
            checks: ['Confirm exactly one seal per wire, square to the axis.'],
          },
        ],
      },
    ],
  },
  {
    name: 'Stripping',
    color: '#C21807',
    description:
      'Cut & strip defects on automatic cut/strip machines (Komax / Schleuniger) — conductor and insulation quality, judged against IPC/WHMA-A-620 conductor-damage limits.',
    failureTypes: [
      {
        name: 'Strands cut or nicked',
        description:
          'Conductor strands are nicked or fully cut during stripping — a defect for all classes when the conductor is damaged, per IPC/WHMA-A-620.',
        rootCauses: [
          {
            title: 'Stripping blade depth set too deep',
            description: 'The blade cuts into the conductor because the depth of cut is set too deep.',
            steps: [
              'Reduce the blade cutting depth to just clear the insulation.',
              'Cross-check with a strand-contact detection (e.g. SmartDetect) run.',
            ],
            checks: ['Confirm no nicked or cut strands under magnification.'],
          },
          {
            title: 'Worn or damaged stripping blades',
            description: 'Dull or chipped blades tear or nick strands instead of cleanly cutting insulation.',
            steps: [
              'Replace the stripping blades and clean the station.',
              'Run test pieces and inspect strands.',
            ],
            checks: ['Confirm the full strand count with no damage.'],
          },
          {
            title: 'Blade not centred on the wire (off-axis)',
            description: 'A wire off the blade axis is nicked on one side.',
            steps: [
              'Centre the blades to the wire axis / correct the V-blade alignment.',
              'Re-strip and inspect.',
            ],
            checks: ['Confirm a concentric strip with no one-sided nicking.'],
          },
          {
            title: 'Wrong blade type for the conductor',
            description: 'A blade profile unsuited to fine-strand or thin-wall wire damages strands.',
            steps: [
              'Fit the correct blade geometry for the wire (e.g. fine-strand or thin-wall).',
              'Validate on samples.',
            ],
            checks: ['Confirm the blade type matches the wire spec.'],
          },
        ],
      },
      {
        name: 'Insulation residue on conductor',
        description: 'Slivers or rings of insulation remain on the conductor after stripping.',
        rootCauses: [
          {
            title: 'Blade depth too shallow',
            description: 'The blade does not fully sever the insulation, leaving residue.',
            steps: [
              'Increase the blade depth to fully sever the insulation.',
              'Re-strip and inspect for residue.',
            ],
            checks: ['Confirm the conductor is clean of insulation.'],
          },
          {
            title: 'Pull-off distance too short / slug not removed',
            description: 'The strip stroke does not fully pull the insulation slug off.',
            steps: [
              'Increase the pull-off (strip) stroke to fully remove the slug.',
              'Verify complete slug removal.',
            ],
            checks: ['Confirm no insulation ring at the strip transition.'],
          },
          {
            title: 'Blunt blades on tough insulation',
            description: 'Cross-linked or tough insulation is not cleanly cut by worn blades.',
            steps: [
              'Replace blades; adjust settings for the insulation material.',
              'Re-test.',
            ],
            checks: ['Confirm a clean cut on the insulation.'],
          },
        ],
      },
      {
        name: 'Strip length out of specification',
        description: 'The stripped length is outside the tolerance for the downstream crimp or seal.',
        rootCauses: [
          {
            title: 'Strip length parameter incorrect',
            description: 'The programmed strip length does not match the crimp / seal spec.',
            steps: [
              'Set the strip length parameter to the crimp / seal spec.',
              'Measure strip length on test pieces.',
            ],
            checks: ['Confirm strip length within tolerance.'],
          },
          {
            title: 'Wire slip in the belts / clamps',
            description: 'Wire slipping in the feed belts or clamps causes length drift.',
            steps: [
              'Check and adjust belt / clamp pressure to prevent slip.',
              'Re-measure over several pieces.',
            ],
            checks: ['Confirm consistent strip length (no drift).'],
          },
          {
            title: 'Encoder / length calibration off',
            description: 'The length measurement (encoder / roller) is out of calibration.',
            steps: [
              'Recalibrate the length measurement (encoder / roller).',
              'Validate against a measured reference.',
            ],
            checks: ['Confirm measured vs programmed length match.'],
          },
        ],
      },
      {
        name: 'Incomplete insulation removal',
        description: 'The insulation is only partly cut or removed, so the slug hangs on or the strip is partial.',
        rootCauses: [
          {
            title: 'Clamp / cut timing not synchronised',
            description: 'The cutter moves before the wire is fully clamped, giving a partial strip.',
            steps: [
              'Correct the clamp-then-cut timing so the wire is held before cutting.',
              'Re-run and inspect.',
            ],
            checks: ['Confirm full clean removal every cycle.'],
          },
          {
            title: 'Insufficient cut depth',
            description: 'The insulation is not fully severed, so the slug stays attached.',
            steps: ['Increase cut depth to fully sever the insulation.', 'Verify complete removal.'],
            checks: ['Confirm no partial slug remains.'],
          },
        ],
      },
      {
        name: 'Conductor deformed or flattened',
        description: 'The conductor is pinched, flattened, or strands are distorted by the strip clamps or blades.',
        rootCauses: [
          {
            title: 'Clamp force too high',
            description: 'Excess gripper / clamp force flattens the conductor.',
            steps: ['Reduce clamp / gripper force to hold without deforming.', 'Inspect conductor shape.'],
            checks: ['Confirm a round, undamaged conductor.'],
          },
          {
            title: 'Blades closing onto the conductor',
            description: 'The blades close too far at pull-off and squeeze the conductor.',
            steps: ['Increase the blade opening at pull-off to clear the conductor.', 'Re-strip and inspect.'],
            checks: ['Confirm the blades do not contact the conductor.'],
          },
        ],
      },
      {
        name: 'Insulation not removed',
        description: 'The wire end is cut, but the insulation is not stripped at all.',
        rootCauses: [
          {
            title: 'Blades not closing / stripping disabled',
            description: 'The strip head does not actuate or the recipe has stripping disabled.',
            steps: [
              'Verify the strip head actuates and the recipe enables stripping.',
              'Run a test cycle.',
            ],
            checks: ['Confirm insulation is removed on every end.'],
          },
          {
            title: 'Wire mis-fed / not clamped',
            description: 'The wire slips or is not clamped, so the strip head misses it.',
            steps: ['Check the wire feed and clamp; clear any slip or jam.', 'Re-run.'],
            checks: ['Confirm the wire is clamped before strip.'],
          },
        ],
      },
      {
        name: 'Cut length out of tolerance',
        description: 'The overall wire cut length is outside tolerance.',
        rootCauses: [
          {
            title: 'Length calibration / material stretch',
            description: 'Miscalibration or wire stretch produces the wrong cut length.',
            steps: [
              'Recalibrate cut length; compensate for wire stretch / slip.',
              'Measure several pieces.',
            ],
            checks: ['Confirm cut length within tolerance.'],
          },
          {
            title: 'Belt / roller wear or slip',
            description: 'Worn feed belts or rollers cause length variation.',
            steps: ['Inspect and replace worn feed belts / rollers.', 'Re-verify length.'],
            checks: ['Confirm stable length across a run.'],
          },
        ],
      },
      {
        name: 'Ragged or torn insulation cut',
        description: 'The insulation cut edge is ragged, torn, or stretched rather than clean.',
        rootCauses: [
          {
            title: 'Dull blades',
            description: 'Worn blades tear rather than cleanly cut the insulation.',
            steps: ['Replace the stripping blades.', 'Inspect the cut-edge quality.'],
            checks: ['Confirm a clean, square insulation cut.'],
          },
          {
            title: 'Strip speed too high for the material',
            description: 'A high pull-off speed tears elastic or soft insulation.',
            steps: ['Reduce the pull-off speed for elastic / soft insulation.', 'Re-test.'],
            checks: ['Confirm no tearing or stretching.'],
          },
        ],
      },
      {
        name: 'Conductor ring-cut (score) on strands',
        description: 'A visible ring score around the conductor from blade over-penetration, creating a stress riser.',
        rootCauses: [
          {
            title: 'Blade depth slightly over the conductor',
            description: 'The blade lightly scores the strands around the full circumference.',
            steps: [
              'Back off the blade depth to the insulation-only setting.',
              'Use strand-contact detection to confirm.',
            ],
            checks: ['Confirm no ring score on the conductor.'],
          },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

async function labelledBuffer(label: string, bg: string, fg = '#FFFFFF'): Promise<Buffer> {
  const safe = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450">
    <rect width="800" height="450" fill="${bg}"/>
    <text x="400" y="235" font-family="Arial, sans-serif" font-size="40" font-weight="bold"
      fill="${fg}" text-anchor="middle">${safe}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
}

// Images live in the database so they survive redeploys on hosts without a
// persistent volume.
async function writeImage(buf: Buffer): Promise<string> {
  const id = crypto.randomUUID();
  await prisma.uploadedFile.create({ data: { id, mimeType: 'image/webp', data: buf } });
  return `/uploads/${id}.webp`;
}

async function main() {
  console.log('Seeding comprehensive wire-processing knowledge base…');

  // Clear existing content (keep users and branding settings).
  await prisma.media.deleteMany();
  await prisma.rootCauseStep.deleteMany();
  await prisma.rootCause.deleteMany();
  await prisma.suggestion.deleteMany();
  await prisma.failureType.deleteMany();
  await prisma.category.deleteMany();

  // Drop orphaned images, but keep the uploaded branding logo.
  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  const logoId = existing?.logoPath ? path.parse(existing.logoPath).name : null;
  await prisma.uploadedFile.deleteMany(
    logoId ? { where: { id: { not: logoId } } } : undefined,
  );

  // Two shared OK/NG placeholder buffers, written as unique files per root cause.
  const okBuf = await labelledBuffer('OK — Conform', '#17843F');
  const ngBuf = await labelledBuffer('NG — Non-conform', '#C21807');

  let ftCount = 0;
  let rcCount = 0;

  for (let ci = 0; ci < DATA.length; ci++) {
    const catSeed = DATA[ci];
    const catImg = await writeImage(await labelledBuffer(catSeed.name, catSeed.color));
    const category = await prisma.category.create({
      data: {
        name: catSeed.name,
        description: catSeed.description,
        imagePath: catImg,
        sortOrder: ci + 1,
      },
    });

    for (let fi = 0; fi < catSeed.failureTypes.length; fi++) {
      const ftSeed = catSeed.failureTypes[fi];
      const ftImg = await writeImage(await labelledBuffer(ftSeed.name, '#334155'));
      const failureType = await prisma.failureType.create({
        data: {
          categoryId: category.id,
          name: ftSeed.name,
          description: ftSeed.description,
          imagePath: ftImg,
          sortOrder: fi + 1,
        },
      });
      ftCount++;

      for (let ri = 0; ri < ftSeed.rootCauses.length; ri++) {
        const rcSeed = ftSeed.rootCauses[ri];
        const stepData = [
          ...rcSeed.steps.map((instruction, idx) => ({
            stepNo: idx + 1,
            instruction,
            type: 'step' as StepType,
          })),
          ...rcSeed.checks.map((instruction, idx) => ({
            stepNo: rcSeed.steps.length + idx + 1,
            instruction,
            type: 'check' as StepType,
          })),
        ];
        const okImg = await writeImage(okBuf);
        const ngImg = await writeImage(ngBuf);
        await prisma.rootCause.create({
          data: {
            failureTypeId: failureType.id,
            title: rcSeed.title,
            description: rcSeed.description,
            rank: ri + 1,
            steps: { create: stepData },
            media: {
              create: [
                { kind: 'OK', filePath: okImg, caption: 'Conform reference' },
                { kind: 'NG', filePath: ngImg, caption: ftSeed.name },
              ],
            },
          },
        });
        rcCount++;
      }
    }
  }

  // Admin user — create if missing, never reset an existing password.
  // Set ADMIN_PASSWORD in the environment for deployments (the fallback is only
  // meant for local development).
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', passwordHash, role: 'admin' },
  });

  // Branding — create defaults if missing, never overwrite customised branding.
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      siteName: 'Défauthèque',
      slogan: 'Find the cause. Fix it right.',
      logoPath: null,
    },
  });

  console.log('Seed complete.');
  console.log('----------------------------------------------------------------');
  console.log(`  Categories:     ${DATA.length}`);
  console.log(`  Failure types:  ${ftCount}`);
  console.log(`  Root causes:    ${rcCount}`);
  console.log(
    `  Admin user (only if newly created): admin / ${
      process.env.ADMIN_PASSWORD ? '<ADMIN_PASSWORD from env>' : 'ChangeMe123!'
    }`,
  );
  console.log('  ⚠  Change the admin password after first login.');
  console.log('----------------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
