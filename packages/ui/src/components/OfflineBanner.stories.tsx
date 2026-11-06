import type { Meta, StoryObj } from "@storybook/react";
import { OfflineBanner } from "./OfflineBanner";

const meta = {
  title: "Components/OfflineBanner",
  component: OfflineBanner,
  args: { text: "Internet yo'q. Ma'lumot saqlanadi va keyin yuboriladi." },
} satisfies Meta<typeof OfflineBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Offline: Story = {};
