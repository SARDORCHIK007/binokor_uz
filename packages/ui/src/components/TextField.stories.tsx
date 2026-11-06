import type { Meta, StoryObj } from "@storybook/react";
import { TextField } from "./TextField";

const meta = {
  title: "Components/TextField",
  component: TextField,
  args: { label: "Telefon", name: "phone", placeholder: "+998" },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: "+998901234567" } };
export const Error: Story = { args: { error: "Telefon raqami 9 ta raqamdan iborat bo'lishi kerak" } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "+998" } };
export const ReadOnly: Story = { args: { readOnly: true, defaultValue: "UB-2026-000123" } };
