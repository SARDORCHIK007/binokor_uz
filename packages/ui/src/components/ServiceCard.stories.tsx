import type { Meta, StoryObj } from "@storybook/react";
import { ServiceCard } from "./ServiceCard";

const meta = {
  title: "Components/ServiceCard",
  component: ServiceCard,
  args: {
    title: "Sertifikatni tekshirish",
    text: "QR orqali usta malakasini ko'ring",
    icon: <span aria-hidden="true">✓</span>,
  },
} satisfies Meta<typeof ServiceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
