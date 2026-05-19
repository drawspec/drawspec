import type { MutableActivityBuilder } from "./activity";

let activeBuilder: MutableActivityBuilder | undefined;

export function getActiveActivityBuilder(): MutableActivityBuilder {
  if (!activeBuilder) {
    throw new Error("Activity element builders must be called inside activityDiagram().");
  }

  return activeBuilder;
}

export function withActiveActivityBuilder<T>(
  builder: MutableActivityBuilder,
  callback: () => T
): T {
  const previousBuilder = activeBuilder;
  activeBuilder = builder;

  try {
    return callback();
  } finally {
    activeBuilder = previousBuilder;
  }
}
