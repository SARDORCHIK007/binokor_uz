export const CABINET_MENUS: Record<string, { href: string; key: string }[]> = {
  admin: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/arizalar", key: "applications" },
    { href: "/kabinet/kurslar", key: "courses" },
    { href: "/kabinet/guruhlar", key: "groups" },
    { href: "/kabinet/foydalanuvchilar", key: "users" },
    { href: "/kabinet/sertifikatlar", key: "certificates" },
    { href: "/kabinet/lugat", key: "vocab" },
    { href: "/kabinet/ishlar", key: "jobs" },
    { href: "/kabinet/hisobot", key: "reports" },
    { href: "/kabinet/buyurtmalar", key: "orders" },
    { href: "/kabinet/ishberuvchi", key: "employer" },
    { href: "/kabinet/portfolio-tasdiq", key: "portfolioReview" },
  ],
  employer_local: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/ishberuvchi", key: "employer" },
  ],
  producer: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/mahsulotlar", key: "products" },
  ],
  education_lead: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/sertifikatlar", key: "certificates" },
  ],
  cert_officer: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/sertifikatlar", key: "certificates" },
  ],
  mentor: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/guruhlar", key: "groups" },
    { href: "/kabinet/davomat", key: "attendance" },
    { href: "/kabinet/baholar", key: "grades" },
    { href: "/kabinet/portfolio-tasdiq", key: "portfolioReview" },
  ],
  curator: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/kurator", key: "curator" },
    { href: "/kabinet/lugat", key: "vocab" },
  ],
  worker: [
    { href: "/kabinet/portfolio", key: "portfolio" },
    { href: "/kabinet/arizam", key: "myApplication" },
  ],
  student: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/davomat", key: "attendance" },
    { href: "/kabinet/baholar", key: "grades" },
    { href: "/kabinet/imtihon", key: "exam" },
    { href: "/kabinet/arizam", key: "myApplication" },
    { href: "/kabinet/lugat", key: "vocab" },
  ],
};
