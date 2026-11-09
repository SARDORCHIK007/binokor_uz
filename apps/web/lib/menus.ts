const ROLE_MENUS: Record<string, { href: string; key: string }[]> = {
  admin: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/arizalar", key: "applications" },
    { href: "/kabinet/kurslar", key: "courses" },
    { href: "/kabinet/guruhlar", key: "groups" },
    { href: "/kabinet/foydalanuvchilar", key: "users" },
    { href: "/kabinet/sertifikatlar", key: "certificates" },
    { href: "/kabinet/imzolash", key: "signing" },
    { href: "/kabinet/lugat", key: "vocab" },
    { href: "/kabinet/ishlar", key: "jobs" },
    { href: "/kabinet/hisobot", key: "reports" },
    { href: "/kabinet/buyurtmalar", key: "orders" },
    { href: "/kabinet/ishberuvchi", key: "employer" },
    { href: "/kabinet/portfolio-tasdiq", key: "portfolioReview" },
    { href: "/kabinet/mahallalar", key: "mahallas" },
  ],
  employer_local: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/ishberuvchi", key: "employer" },
    { href: "/kabinet/saralanganlar", key: "shortlist" },
  ],
  producer: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/mahsulotlar", key: "products" },
    { href: "/kabinet/statistika", key: "producerStats" },
  ],
  education_lead: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/sertifikatlar", key: "certificates" },
    { href: "/kabinet/imzolash", key: "signing" },
  ],
  cert_officer: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/sertifikatlar", key: "certificates" },
    { href: "/kabinet/imzolash", key: "signing" },
  ],
  mentor: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/guruhlar", key: "groups" },
    { href: "/kabinet/davomat", key: "attendance" },
    { href: "/kabinet/baholar", key: "grades" },
    { href: "/kabinet/portfolio-tasdiq", key: "portfolioReview" },
    { href: "/kabinet/tinglovchilar", key: "students" },
  ],
  curator: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/kurator", key: "curator" },
    { href: "/kabinet/lugat", key: "vocab" },
  ],
  worker: [
    { href: "/kabinet/pasport", key: "passport" },
    { href: "/kabinet/portfolio", key: "portfolio" },
    { href: "/kabinet/arizam", key: "myApplication" },
    { href: "/kabinet/takliflar", key: "offers" },
    { href: "/kabinet/profil-usta", key: "workerProfile" },
  ],
  student: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/davomat", key: "attendance" },
    { href: "/kabinet/baholar", key: "grades" },
    { href: "/kabinet/imtihon", key: "exam" },
    { href: "/kabinet/arizam", key: "myApplication" },
    { href: "/kabinet/pasport", key: "passport" },
    { href: "/kabinet/lugat", key: "vocab" },
    { href: "/kabinet/yutuqlarim", key: "progress" },
  ],
};

const EVERYONE = [
  { href: "/kabinet/bildirishnomalar", key: "notifications" },
  { href: "/kabinet/sozlamalar", key: "settings" },
];

/** Every role also gets the notification centre and the settings page. */
export const CABINET_MENUS: Record<string, { href: string; key: string }[]> = Object.fromEntries(
  Object.entries(ROLE_MENUS).map(([role, items]) => [role, [...items, ...EVERYONE]]),
);
