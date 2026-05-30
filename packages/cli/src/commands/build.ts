import { galleryCommand } from "./gallery";
import { red } from "./shared";
import type { DrawspecCommand } from "./types";

export const buildCommand: DrawspecCommand = {
  name: "build",
  description: "Build DrawSpec artifacts",
  hidden: true,
  async run(parsed, config) {
    console.error(red("Unknown build target. Try 'drawspec build docs' or 'drawspec gallery'."));
    if (parsed.files[0] === "site")
      return galleryCommand.run(
        { ...parsed, command: "gallery", files: parsed.files.slice(1) },
        config
      );
    return 1;
  },
};
