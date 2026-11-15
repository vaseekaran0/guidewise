import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AnimatePresence,
  motion,
  MotionConfig as FramerMotionConfig,
  useReducedMotion,
  type Transition,
  type Variants,
} from 'framer-motion';
import { MotionConfig } from 'motion/react';
import { Layout } from './components/Layout.js';
import { useMotionEnabled } from './hooks/useMotionEnabled.js';
import { AboutPage } from './pages/AboutPage.js';
import { ComparePage } from './pages/ComparePage.js';
import { HologramLabPage } from './pages/HologramLabPage.js';
import { LandingPage } from './pages/LandingPage.js';
import { LearnPage } from './pages/LearnPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { SimulatorPage } from './pages/SimulatorPage.js';
import { TEST_VECTOR } from './shared/crisprEngine.js';
import { AppLanguage } from './data/i18n.js';
import { AnalyzeApiResponse, AppPage, PamType } from './types/crispr.js';

const VALID_PAGES: AppPage[] = ['landing', 'simulator', 'compare', 'lab', 'learn', 'reports', 'about'];

function pageFromHash(): AppPage {
  if (typeof window === 'undefined') return 'landing';
  const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase() as AppPage;
  return VALID_PAGES.includes(raw) ? raw : 'landing';
}

interface PageCameraTransitionResult {
  direction: number;
  isTransitioning: boolean;
  shouldAnimate: boolean;
  variants: Variants;
  transition: Transition;
  stageStyle: React.CSSProperties;
  contentStyle: React.CSSProperties;
  onAnimationStart: () => void;
  onAnimationComplete: () => void;
}

/**
 * Custom Framer Motion hook creating a bidirectional 3D cinema "camera pull"
 * and rack-focus depth-of-field zoom across route transitions.
 */
function usePageCameraTransition(
  currentPage: AppPage,
  motionEnabled: boolean
): PageCameraTransitionResult {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = motionEnabled && !prefersReducedMotion;

  const [prevPage, setPrevPage] = useState<AppPage>(currentPage);
  const [direction, setDirection] = useState<number>(1);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  if (currentPage !== prevPage) {
    const prevIdx = VALID_PAGES.indexOf(prevPage);
    const nextIdx = VALID_PAGES.indexOf(currentPage);
    setDirection(nextIdx >= prevIdx ? 1 : -1);
    setPrevPage(currentPage);
  }

  useEffect(() => {
    if (!shouldAnimate) {
      setIsTransitioning(false);
      return;
    }
    setIsTransitioning(true);
    const safetyTimer = window.setTimeout(() => setIsTransitioning(false), 720);
    return () => window.clearTimeout(safetyTimer);
  }, [currentPage, shouldAnimate]);

  const onAnimationStart = useCallback(() => {
    if (shouldAnimate) {
      setIsTransitioning(true);
    }
  }, [shouldAnimate]);

  const onAnimationComplete = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  const variants = useMemo<Variants>(() => {
    if (!shouldAnimate) {
      return {
        initial: { opacity: 1, scale: 1, x: 0, y: 0, z: 0, rotateX: 0, rotateY: 0, filter: 'none' },
        animate: { opacity: 1, scale: 1, x: 0, y: 0, z: 0, rotateX: 0, rotateY: 0, filter: 'none' },
        exit: { opacity: 1, scale: 1, x: 0, y: 0, z: 0, rotateX: 0, rotateY: 0, filter: 'none' },
      };
    }

    return {
      initial: (dir: number) =>
        dir >= 0
          ? {
              opacity: 0,
              scale: 1.075,
              z: 110,
              x: 34,
              y: -6,
              rotateY: 5.2,
              rotateX: -1.6,
              filter: 'blur(14px) brightness(1.08) saturate(1.12)',
            }
          : {
              opacity: 0,
              scale: 0.91,
              z: -150,
              x: -34,
              y: 6,
              rotateY: -5.2,
              rotateX: 1.6,
              filter: 'blur(14px) brightness(0.86) saturate(0.95)',
            },
      animate: {
        opacity: 1,
        scale: 1,
        z: 0,
        x: 0,
        y: 0,
        rotateY: 0,
        rotateX: 0,
        filter: 'blur(0px) brightness(1) saturate(1)',
        transitionEnd: {
          filter: 'none',
          transform: 'none',
        },
        transition: {
          duration: 0.56,
          ease: [0.19, 1, 0.22, 1],
          filter: { duration: 0.46, ease: [0.22, 1, 0.36, 1] },
          opacity: { duration: 0.36, ease: 'easeOut' },
        },
      },
      exit: (dir: number) => ({
        opacity: 0,
        scale: dir >= 0 ? 0.9 : 1.085,
        z: dir >= 0 ? -170 : 120,
        x: dir >= 0 ? -30 : 30,
        y: dir >= 0 ? 6 : -6,
        rotateY: dir >= 0 ? -4.5 : 4.5,
        rotateX: dir >= 0 ? 1.4 : -1.4,
        filter: dir >= 0 ? 'blur(12px) brightness(0.82)' : 'blur(12px) brightness(1.08)',
        transition: {
          duration: 0.34,
          ease: [0.4, 0, 0.2, 1],
        },
      }),
    };
  }, [shouldAnimate]);

  const transition = useMemo<Transition>(
    () =>
      shouldAnimate
        ? { duration: 0.56, ease: [0.19, 1, 0.22, 1] }
        : { duration: 0 },
    [shouldAnimate]
  );

  const stageStyle = useMemo<React.CSSProperties>(
    () => ({
      perspective: '1600px',
      perspectiveOrigin: '50% 42%',
      transformStyle: 'preserve-3d',
    }),
    []
  );

  const contentStyle = useMemo<React.CSSProperties>(
    () => ({
      transformOrigin: 'center 42%',
      transformStyle: 'preserve-3d',
      willChange: isTransitioning ? 'transform, filter, opacity' : 'auto',
    }),
    [isTransitioning]
  );

  return {
    direction,
    isTransitioning,
    shouldAnimate,
    variants,
    transition,
    stageStyle,
    contentStyle,
    onAnimationStart,
    onAnimationComplete,
  };
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>(() => pageFromHash());
  const [latestRun, setLatestRun] = useState<AnalyzeApiResponse | null>(null);
  const { motionEnabled, toggleMotion } = useMotionEnabled();
  const cameraTransition = usePageCameraTransition(currentPage, motionEnabled);
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(() => {
    if (typeof window === 'undefined') return 'en';
    const saved = window.localStorage.getItem('guidewise-language');
    return saved === 'ta' ? 'ta' : 'en';
  });

  const handleToggleAppLanguage = () => {
    setAppLanguage((prev) => {
      const next: AppLanguage = prev === 'en' ? 'ta' : 'en';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('guidewise-language', next);
      }
      return next;
    });
  };

  const [simulatorPreset, setSimulatorPreset] = useState<{
    dna?: string;
    guide?: string;
    pam?: PamType;
    maxMm?: number;
    autoPlay?: boolean;
  } | null>(null);

  const [comparePreset, setComparePreset] = useState<{
    dna: string;
    guides: string[];
    pam: PamType;
    maxMm: number;
  } | null>(null);

  useEffect(() => {
    const onHashChange = () => {
      setCurrentPage(pageFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (page: AppPage) => {
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      const targetHash = page === 'landing' ? '#/' : `#/${page}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
      window.scrollTo({ top: 0, behavior: motionEnabled ? 'smooth' : 'auto' });
    }
  };

  const handleLaunchSimulator = () => {
    setSimulatorPreset({
      dna: TEST_VECTOR.dna,
      guide: TEST_VECTOR.guide,
      pam: TEST_VECTOR.pam,
      maxMm: TEST_VECTOR.maxMm,
      autoPlay: false,
    });
    navigate('simulator');
  };

  const handleWatchDemo = () => {
    setSimulatorPreset({
      dna: TEST_VECTOR.dna,
      guide: TEST_VECTOR.guide,
      pam: TEST_VECTOR.pam,
      maxMm: TEST_VECTOR.maxMm,
      autoPlay: true,
    });
    navigate('simulator');
  };

  const handleSendToCompare = (dna: string, guide: string, pam: PamType, maxMm: number) => {
    setComparePreset({
      dna,
      guides: [guide, 'TGGCCATTAGCATGATGCGT', 'GATCCGTAACGGTTCATCTA'],
      pam,
      maxMm,
    });
    navigate('compare');
  };

  const handleReloadInSimulator = (dna: string, guide: string, pam: PamType, maxMm: number) => {
    setSimulatorPreset({ dna, guide, pam, maxMm, autoPlay: true });
    navigate('simulator');
  };

  return (
    <FramerMotionConfig reducedMotion={motionEnabled ? 'user' : 'always'}>
      <MotionConfig reducedMotion={motionEnabled ? 'user' : 'always'}>
        <Layout
          currentPage={currentPage}
          onNavigate={navigate}
          motionEnabled={motionEnabled}
          onToggleMotion={toggleMotion}
          language={appLanguage}
          onToggleLanguage={handleToggleAppLanguage}
        >
          <div className="gw-stage-3d relative flex-1 flex flex-col" style={cameraTransition.stageStyle}>
            {/* Subtle optical depth-of-field vignette sweep during active camera pull */}
            <AnimatePresence>
              {cameraTransition.isTransitioning && cameraTransition.shouldAnimate && (
                <motion.div
                  key="gw-camera-dof-sweep"
                  aria-hidden="true"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.45 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="pointer-events-none fixed inset-0 z-30"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 42%, transparent 38%, rgba(5, 10, 20, 0.55) 100%)',
                  }}
                />
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait" custom={cameraTransition.direction}>
              <motion.div
                key={currentPage}
                custom={cameraTransition.direction}
                variants={cameraTransition.variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={cameraTransition.transition}
                onAnimationStart={cameraTransition.onAnimationStart}
                onAnimationComplete={cameraTransition.onAnimationComplete}
                style={cameraTransition.contentStyle}
                className="flex-1 flex flex-col"
              >
                {currentPage === 'landing' && (
                  <LandingPage
                    onLaunchSimulator={handleLaunchSimulator}
                    onWatchDemo={handleWatchDemo}
                    onNavigate={navigate}
                    motionEnabled={motionEnabled}
                    language={appLanguage}
                  />
                )}
                {currentPage === 'simulator' && (
                  <SimulatorPage
                    initialState={simulatorPreset}
                    onAnalysisComplete={(res) => setLatestRun(res)}
                    onSendToCompare={handleSendToCompare}
                    onNavigate={navigate}
                    motionEnabled={motionEnabled}
                    language={appLanguage}
                  />
                )}
                {currentPage === 'compare' && (
                  <ComparePage
                    initialCompare={comparePreset}
                    onLoadInSimulator={handleReloadInSimulator}
                    motionEnabled={motionEnabled}
                    language={appLanguage}
                  />
                )}
                {currentPage === 'lab' && (
                  <HologramLabPage
                    motionEnabled={motionEnabled}
                    onNavigate={navigate}
                    appLanguage={appLanguage}
                  />
                )}
                {currentPage === 'learn' && (
                  <LearnPage latestRun={latestRun} motionEnabled={motionEnabled} language={appLanguage} />
                )}
                {currentPage === 'reports' && (
                  <ReportsPage
                    onReloadRunInSimulator={handleReloadInSimulator}
                    motionEnabled={motionEnabled}
                    language={appLanguage}
                  />
                )}
                {currentPage === 'about' && <AboutPage language={appLanguage} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </Layout>
      </MotionConfig>
    </FramerMotionConfig>
  );
}
