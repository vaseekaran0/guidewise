import type { AppPage } from '../types/crispr.js';

export type AppLanguage = 'en' | 'ta';

export interface UiStrings {
  disclaimerBanner: string;
  home: string;
  nav: Record<Exclude<AppPage, 'landing'>, string>;
  motionOn: string;
  motionOff: string;
  launchSimulator: string;
  workspace: string;
  deterministicTitle: string;
  deterministicBody: string;
  backToOverview: string;
  footerTitle: string;
  heroTitlePrefix: string;
  heroTitleHighlight: string;
  heroTitleSuffix: string;
  heroSubtitle: string;
  watchDemo: string;
  openHologramLab: string;
  simTitle: string;
  simSubtitle: string;
  compareTitle: string;
  learnTitle: string;
  reportsTitle: string;
  aboutTitle: string;
}

export const UI_STRINGS: Record<AppLanguage, UiStrings> = {
  en: {
    disclaimerBanner:
      'Synthetic educational simulation. Scores are educational estimates, not experimentally validated. No real genetic modification.',
    home: 'Home',
    nav: {
      simulator: 'Simulator',
      compare: 'Compare',
      lab: 'Hologram Lab',
      learn: 'Learn',
      reports: 'Reports',
      about: 'About',
    },
    motionOn: 'Motion: On',
    motionOff: 'Motion: Off',
    launchSimulator: 'Launch simulator',
    workspace: 'Workspace',
    deterministicTitle: 'Deterministic Engine',
    deterministicBody:
      'Sliding-window Hamming distance, 10-bp seed weighting, and 3′ PAM validation on synthetic DNA.',
    backToOverview: '← Back to overview',
    footerTitle: 'GuideWise · Synthetic Educational CRISPR-Cas9 Simulation',
    heroTitlePrefix: 'Understand ',
    heroTitleHighlight: 'CRISPR-Cas9',
    heroTitleSuffix: ' through live synthetic DNA simulation.',
    heroSubtitle:
      'Trace guide RNA matching across both strands, inspect 3′ PAM checkpoints, compare mismatch penalties in the 10-bp seed region, and explore cleavage in interactive 3D.',
    watchDemo: 'Watch demo',
    openHologramLab: '3D Hologram Lab',
    simTitle: 'CRISPR-Cas9 Simulator',
    simSubtitle:
      'Enter synthetic DNA and guide RNA sequences to inspect bidirectional matching, 3′ PAM validation, educational off-target estimates, and illustration-only cut sites.',
    compareTitle: 'Compare Multiple Guide RNAs',
    learnTitle: 'CRISPR-Cas9 Interactive Learning Hub',
    reportsTitle: 'Simulation History & Downloadable Reports',
    aboutTitle: 'About GuideWise · Rules, Math & Safety',
  },
  ta: {
    disclaimerBanner:
      'செயற்கை கல்வி உருவகப்படுத்துதல் மட்டுமே. மதிப்பெண்கள் கல்வி மதிப்பீடுகள் மட்டுமே (Educational Estimates), ஆய்வகச் சோதனை அல்ல. உண்மையான மரபணு மாற்றம் இல்லை.',
    home: 'முகப்பு',
    nav: {
      simulator: 'சிமுலேட்டர்',
      compare: 'ஒப்பீடு',
      lab: '3D ஆய்வகம்',
      learn: 'கற்க',
      reports: 'அறிக்கைகள்',
      about: 'பற்றி',
    },
    motionOn: 'இயக்கம்: ஆன்',
    motionOff: 'இயக்கம்: ஆஃப்',
    launchSimulator: 'சிமுலேட்டர் தொடங்கு',
    workspace: 'பணியிடம்',
    deterministicTitle: 'துல்லிய கணித இயந்திரம்',
    deterministicBody:
      'செயற்கை DNA-வில் Hamming தூரம், 10-bp seed எடை மற்றும் 3′ PAM சரிபார்ப்பு.',
    backToOverview: '← முகப்புக்குத் திரும்பு',
    footerTitle: 'GuideWise · செயற்கை கல்வி CRISPR-Cas9 உருவகப்படுத்துதல்',
    heroTitlePrefix: '',
    heroTitleHighlight: 'CRISPR-Cas9',
    heroTitleSuffix: ' அறிவியலை நேரடி செயற்கை DNA உருவகப்படுத்துதல் மூலம் கற்க.',
    heroSubtitle:
      'இரு இழைகளிலும் guide RNA பொருத்தத்தை அறியலாம், 3′ PAM சோதனையைப் பார்க்கலாம், 10-bp seed தவறு மதிப்பீடுகளை ஒப்பிடலாம், மேலும் 3D மாதிரியில் வெட்டு இடத்தை ஆராயலாம்.',
    watchDemo: 'டெமோ பார்க்க',
    openHologramLab: '3D ஹாலோகிராம் ஆய்வகம்',
    simTitle: 'CRISPR-Cas9 சிமுலேட்டர்',
    simSubtitle:
      'செயற்கை DNA மற்றும் guide RNA வரிசைகளை உள்ளிட்டு இரு-இழை பொருத்தம், 3′ PAM சோதனை, கல்வி off-target மதிப்பீடு மற்றும் மாதிரி வெட்டு இடத்தை ஆராயுங்கள்.',
    compareTitle: 'பல Guide RNA ஒப்பீடு',
    learnTitle: 'CRISPR-Cas9 கற்றல் மையம்',
    reportsTitle: 'உருவகப்படுத்துதல் வரலாறு & அறிக்கைகள்',
    aboutTitle: 'GuideWise பற்றி · விதிகள், கணிதம் & பாதுகாப்பு',
  },
};
