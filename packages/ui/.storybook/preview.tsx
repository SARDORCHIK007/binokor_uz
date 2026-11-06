import type { Preview } from "@storybook/react";
import "./preview.css";

const preview: Preview = {
  parameters: {
    layout: "padded",
    backgrounds: { default: "canvas", values: [{ name: "canvas", value: "#f4f6f9" }] },
  },
};

export default preview;
