import type { Meta, StoryObj } from "@storybook/react";
import { PresenceToggle } from "./PresenceToggle";

const meta = {
  title: "Components/PresenceToggle",
  component: PresenceToggle,
  args: {
    name: "Aziz K.",
    present: true,
    presentLabel: "Keldi",
    absentLabel: "Yo'q",
    onToggle: () => undefined,
  },
} satisfies Meta<typeof PresenceToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Present: Story = {};
export const Absent: Story = { args: { present: false } };
