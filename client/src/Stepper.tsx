import React, { useState, Children, useRef, useLayoutEffect, type HTMLAttributes, type ReactNode } from "react";
import { motion, AnimatePresence, type Variants } from "motion/react";

interface StepperProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onFinalStepCompleted?: () => void;
  onBeforeNext?: (currentStep: number) => Promise<boolean>;
  stepCircleContainerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  backButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  nextButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  backButtonText?: string;
  nextButtonText?: string;
  completeButtonText?: string;
  disableStepIndicators?: boolean;
}

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  onBeforeNext,
  stepCircleContainerClassName = "",
  contentClassName = "",
  footerClassName = "",
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = "Back",
  nextButtonText = "Continue",
  completeButtonText = "Verify",
  disableStepIndicators = false,
  ...rest
}: StepperProps) {
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [direction, setDirection] = useState<number>(0);
  const [advancing, setAdvancing] = useState(false);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isCompleted = currentStep > totalSteps;
  const isLastStep = currentStep === totalSteps;

  const updateStep = (newStep: number) => {
    setCurrentStep(newStep);
    if (newStep > totalSteps) {
      onFinalStepCompleted();
    } else {
      onStepChange(newStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      updateStep(currentStep - 1);
    }
  };

  const handleNext = async () => {
    if (onBeforeNext) {
      setAdvancing(true);
      const ok = await onBeforeNext(currentStep);
      setAdvancing(false);
      if (!ok) return;
    }
    if (!isLastStep) {
      setDirection(1);
      updateStep(currentStep + 1);
    }
  };

  const handleComplete = async () => {
    if (onBeforeNext) {
      setAdvancing(true);
      const ok = await onBeforeNext(currentStep);
      setAdvancing(false);
      if (!ok) return;
    }
    setDirection(1);
    updateStep(totalSteps + 1);
  };

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || advancing) return;
    // Don't intercept Enter inside a textarea
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
    isLastStep ? handleComplete() : handleNext();
  };

  return (
    <div onKeyDown={handleEnter} {...rest}>
      <div className={`flex w-full items-center pb-6 ${stepCircleContainerClassName}`}>
        {stepsArray.map((_, index) => {
          const stepNumber = index + 1;
          const isNotLastStep = index < totalSteps - 1;
          return (
            <React.Fragment key={stepNumber}>
              <StepIndicator
                step={stepNumber}
                disableStepIndicators={disableStepIndicators}
                currentStep={currentStep}
                onClickStep={(clicked) => {
                  setDirection(clicked > currentStep ? 1 : -1);
                  updateStep(clicked);
                }}
              />
              {isNotLastStep && <StepConnector isComplete={currentStep > stepNumber} />}
            </React.Fragment>
          );
        })}
      </div>

      <StepContentWrapper
        isCompleted={isCompleted}
        currentStep={currentStep}
        direction={direction}
        className={contentClassName}
      >
        {stepsArray[currentStep - 1]}
      </StepContentWrapper>

      {!isCompleted && (
        <div className={`pt-6 ${footerClassName}`}>
          <div className={`flex ${currentStep !== 1 ? "justify-between" : "justify-end"}`}>
            {currentStep !== 1 && (
              <button
                onClick={handleBack}
                className="text-sm text-muted hover:text-fg transition"
                {...backButtonProps}
              >
                {backButtonText}
              </button>
            )}
            <button
              onClick={isLastStep ? handleComplete : handleNext}
              disabled={advancing || nextButtonProps.disabled}
              className={`py-2.5 px-5 rounded-lg bg-accent text-tiletext font-semibold shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:brightness-110 active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 transition-all duration-100 ${currentStep === 1 ? "w-full" : ""}`}
              {...nextButtonProps}
            >
              {advancing ? "Working..." : isLastStep ? completeButtonText : nextButtonText}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface StepContentWrapperProps {
  isCompleted: boolean;
  currentStep: number;
  direction: number;
  children: ReactNode;
  className?: string;
}

function StepContentWrapper({
  isCompleted,
  currentStep,
  direction,
  children,
  className = "",
}: StepContentWrapperProps) {
  const [parentHeight, setParentHeight] = useState<number>(0);

  return (
    <motion.div
      style={{ position: "relative", overflow: "hidden" }}
      animate={{ height: isCompleted ? 0 : parentHeight }}
      transition={{ type: "spring", duration: 0.4 }}
      className={className}
    >
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        {!isCompleted && (
          <SlideTransition key={currentStep} direction={direction} onHeightReady={(h) => setParentHeight(h)}>
            {children}
          </SlideTransition>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface SlideTransitionProps {
  children: ReactNode;
  direction: number;
  onHeightReady: (height: number) => void;
}

function SlideTransition({ children, direction, onHeightReady }: SlideTransitionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (containerRef.current) {
      onHeightReady(containerRef.current.offsetHeight);
    }
  }, [children, onHeightReady]);

  return (
    <motion.div
      ref={containerRef}
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4 }}
      style={{ position: "absolute", left: 0, right: 0, top: 0 }}
    >
      {children}
    </motion.div>
  );
}

const stepVariants: Variants = {
  enter: (dir: number) => ({ x: dir >= 0 ? "-100%" : "100%", opacity: 0 }),
  center: { x: "0%", opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? "50%" : "-50%", opacity: 0 }),
};

export function Step({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

interface StepIndicatorProps {
  step: number;
  currentStep: number;
  onClickStep: (clicked: number) => void;
  disableStepIndicators?: boolean;
}

function StepIndicator({ step, currentStep, onClickStep, disableStepIndicators = false }: StepIndicatorProps) {
  const status = currentStep === step ? "active" : currentStep < step ? "inactive" : "complete";

  return (
    <motion.div
      onClick={() => { if (step !== currentStep && !disableStepIndicators) onClickStep(step); }}
      className={`relative outline-none focus:outline-none ${disableStepIndicators ? "pointer-events-none" : "cursor-pointer"}`}
      animate={status}
      initial={false}
    >
      <motion.div
        variants={{
          inactive: { scale: 1, backgroundColor: "var(--bg)", borderColor: "rgba(var(--border-rgb,46,41,0),0.6)", color: "var(--muted)" },
          active:   { scale: 1, backgroundColor: "var(--accent)", borderColor: "var(--accent)", color: "var(--accent)" },
          complete: { scale: 1, backgroundColor: "var(--accent)", borderColor: "var(--accent)", color: "var(--tile-text)" },
        }}
        transition={{ duration: 0.3 }}
        className="flex h-8 w-8 items-center justify-center rounded-full font-semibold border"
      >
        {status === "complete" ? (
          <CheckIcon className="h-4 w-4 text-tiletext" />
        ) : status === "active" ? (
          <div className="h-3 w-3 rounded-full bg-bg" />
        ) : (
          <span className="text-sm">{step}</span>
        )}
      </motion.div>
    </motion.div>
  );
}

function StepConnector({ isComplete }: { isComplete: boolean }) {
  const lineVariants: Variants = {
    incomplete: { width: 0, backgroundColor: "transparent" },
    complete: { width: "100%", backgroundColor: "var(--accent)" },
  };

  return (
    <div className="relative mx-2 h-0.5 flex-1 overflow-hidden rounded bg-border-app/40">
      <motion.div
        className="absolute left-0 top-0 h-full"
        variants={lineVariants}
        initial={false}
        animate={isComplete ? "complete" : "incomplete"}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: "tween", ease: "easeOut", duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
