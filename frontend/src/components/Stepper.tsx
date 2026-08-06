import { Check } from "lucide-react";

interface StepperProps {
  steps: string[];
  currentStep: number; // 0-indexed
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex items-center w-full" role="list" aria-label="Progress">
      {steps.map((label, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;
        return (
          <div key={label} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 transition-colors ${
                  isDone
                    ? "bg-primary text-primary-foreground"
                    : isActive
                      ? "bg-primary/10 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground border border-border"
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                {isDone ? <Check size={12} strokeWidth={3} /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${isDone ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}