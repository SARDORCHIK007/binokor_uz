import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";

const meta = {
  title: "Components/EmptyState",
  component: EmptyState,
  args: {
    title: "Hozircha bo'sh",
    text: "Ma'lumot paydo bo'lganda shu yerda chiqadi.",
    action: <Button variant="secondary">Orqaga</Button>,
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAction: Story = {};
export const WithoutAction: Story = { args: { action: undefined } };
