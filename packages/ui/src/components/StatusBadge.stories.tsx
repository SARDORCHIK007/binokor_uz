import type { Meta, StoryObj } from "@storybook/react";
import { StatusBadge } from "./StatusBadge";

const meta = {
  title: "Components/StatusBadge",
  component: StatusBadge,
  args: { tone: "success", children: "Haqiqiy" },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {};
export const Warning: Story = { args: { tone: "warning", children: "Muzokara" } };
export const Danger: Story = { args: { tone: "danger", children: "Bekor qilingan" } };
export const Info: Story = { args: { tone: "info", children: "Rejalashtirilgan" } };
