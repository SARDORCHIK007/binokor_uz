import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => ({
  locale: "uz-Latn",
  messages: (await import("../messages/uz-Latn.json")).default,
}));
